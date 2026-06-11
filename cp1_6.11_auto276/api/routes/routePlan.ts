import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { PASSES, ROADS, SPEED_MAP, FUEL_CONFIG } from "../../src/types.js";

const router = Router();

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildAdjacencyList(): Map<
  string,
  { neighbor: string; distance: number; roadId: string }[]
> {
  const adj = new Map<
    string,
    { neighbor: string; distance: number; roadId: string }[]
  >();
  for (const pass of PASSES) {
    adj.set(pass.id, []);
  }
  for (const road of ROADS) {
    adj.get(road.from)!.push({
      neighbor: road.to,
      distance: road.distanceKm,
      roadId: road.id,
    });
    adj.get(road.to)!.push({
      neighbor: road.from,
      distance: road.distanceKm,
      roadId: road.id,
    });
  }
  return adj;
}

function dijkstra(
  start: string,
  end: string,
  adj: Map<string, { neighbor: string; distance: number; roadId: string }[]>,
  speed: number
): { path: string[]; totalDistance: number } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const pass of PASSES) {
    dist.set(pass.id, Infinity);
    prev.set(pass.id, null);
  }
  dist.set(start, 0);

  while (visited.size < PASSES.length) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < minDist) {
        minDist = d;
        u = node;
      }
    }
    if (u === null || u === end) break;
    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const { neighbor, distance } of neighbors) {
      if (visited.has(neighbor)) continue;
      const alt = dist.get(u)! + distance / speed;
      if (alt < dist.get(neighbor)!) {
        dist.set(neighbor, alt);
        prev.set(neighbor, u);
      }
    }
  }

  if (dist.get(end) === Infinity) return null;

  const path: string[] = [];
  let current: string | null = end;
  while (current) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return { path, totalDistance: dist.get(end)! };
}

function analyzeBeaconVisibility(
  path: string[],
  beaconSettings: {
    passId: string;
    igniteTiming: string;
    fuelType: string;
    windCorrection: number;
  }[]
): {
  beaconResults: {
    passId: string;
    visible: boolean;
    misreportProbability: number;
  }[];
  riskSegments: {
    from: string;
    to: string;
    type: "broken" | "misreport";
    probability?: number;
  }[];
} {
  const beaconResults: {
    passId: string;
    visible: boolean;
    misreportProbability: number;
  }[] = [];
  const riskSegments: {
    from: string;
    to: string;
    type: "broken" | "misreport";
    probability?: number;
  }[] = [];

  const passMap = new Map(PASSES.map((p) => [p.id, p]));
  const settingsMap = new Map(beaconSettings.map((s) => [s.passId, s]));

  for (let i = 0; i < path.length - 1; i++) {
    const currentId = path[i];
    const nextId = path[i + 1];
    const current = passMap.get(currentId)!;
    const next = passMap.get(nextId)!;

    const distance = haversineDistance(
      current.latitude,
      current.longitude,
      next.latitude,
      next.longitude
    );

    const currentSetting = settingsMap.get(currentId);
    const fuelType = currentSetting?.fuelType || "wood";
    const windCorrection = currentSetting?.windCorrection || 0;
    const fuelConfig = FUEL_CONFIG[fuelType];

    const bearing =
      (Math.atan2(
        next.longitude - current.longitude,
        next.latitude - current.latitude
      ) *
        180) /
      Math.PI;
    const windOffset = Math.abs(windCorrection);
    const angleDeviation = windOffset;

    const visible = distance <= fuelConfig.visibility;
    let misreportProbability = 0;

    if (angleDeviation > 45) {
      misreportProbability = 0.1 + (angleDeviation - 45) * (0.2 / 45);
      misreportProbability = Math.min(misreportProbability, 0.3);
    }

    beaconResults.push({
      passId: currentId,
      visible,
      misreportProbability,
    });

    if (!visible) {
      riskSegments.push({
        from: currentId,
        to: nextId,
        type: "broken",
      });
    } else if (misreportProbability > 0) {
      riskSegments.push({
        from: currentId,
        to: nextId,
        type: "misreport",
        probability: misreportProbability,
      });
    }
  }

  const lastSetting = settingsMap.get(path[path.length - 1]);
  beaconResults.push({
    passId: path[path.length - 1],
    visible: true,
    misreportProbability: 0,
  });

  return { beaconResults, riskSegments };
}

const BeaconSettingSchema = z.object({
  passId: z.string(),
  igniteTiming: z.enum(["immediate", "delayed", "disabled"]),
  fuelType: z.enum(["hay", "wood", "pitch"]),
  windCorrection: z.number().min(-30).max(30),
});

const RoutePlanRequestSchema = z.object({
  waypoints: z.array(z.string()).min(2).max(5),
  speeds: z.array(z.enum(["walk", "horse", "fast_horse"])),
  fuelType: z.enum(["hay", "wood", "pitch"]),
  beaconSettings: z.array(BeaconSettingSchema),
});

router.post("/", (req: Request, res: Response): void => {
  const startTime = Date.now();

  const parsed = RoutePlanRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request parameters",
      details: parsed.error.errors,
    });
    return;
  }

  const { waypoints, speeds, fuelType, beaconSettings } = parsed.data;
  const adj = buildAdjacencyList();

  const allSegments: {
    from: string;
    to: string;
    distance: number;
    speed: number;
    timeMinutes: number;
  }[] = [];
  let totalMinutes = 0;
  const fullNodes: string[] = [waypoints[0]];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const speedKey = speeds[i] || speeds[speeds.length - 1] || "horse";
    const speed = SPEED_MAP[speedKey];
    const result = dijkstra(waypoints[i], waypoints[i + 1], adj, speed);

    if (!result) {
      res.status(404).json({
        success: false,
        error: `No path found from ${waypoints[i]} to ${waypoints[i + 1]}`,
      });
      return;
    }

    const passMap = new Map(PASSES.map((p) => [p.id, p]));
    for (let j = 1; j < result.path.length; j++) {
      const fromPass = passMap.get(result.path[j - 1])!;
      const toPass = passMap.get(result.path[j])!;
      const segDist = haversineDistance(
        fromPass.latitude,
        fromPass.longitude,
        toPass.latitude,
        toPass.longitude
      );
      const segTime = (segDist / speed) * 60;
      allSegments.push({
        from: result.path[j - 1],
        to: result.path[j],
        distance: Math.round(segDist * 10) / 10,
        speed,
        timeMinutes: Math.round(segTime * 10) / 10,
      });
      totalMinutes += segTime;
    }

    for (let j = 1; j < result.path.length; j++) {
      fullNodes.push(result.path[j]);
    }
  }

  const { beaconResults, riskSegments } = analyzeBeaconVisibility(
    fullNodes,
    beaconSettings
  );

  const elapsed = Date.now() - startTime;

  const response = {
    path: {
      nodes: fullNodes,
      segments: allSegments,
    },
    totalTimeMinutes: Math.round(totalMinutes * 10) / 10,
    beaconResults,
    riskSegments,
    computeTimeMs: elapsed,
  };

  res.status(200).json({ success: true, data: response });
});

export default router;
