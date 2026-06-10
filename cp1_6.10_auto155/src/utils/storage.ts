import { Recipe, RecipeIngredient, RadarDimension } from '../types';
import { RADAR_LABELS } from '../types';

const STORAGE_KEY = 'fragrance_recipes';

export function loadRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Recipe[];
  } catch {
    return [];
  }
}

export function saveRecipes(recipes: Recipe[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function generateRecipeName(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `配方_${ts}`;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateRadarScores(
  ingredients: RecipeIngredient[]
): { dimension: RadarDimension; label: string; value: number }[] {
  const totalWeight = ingredients.reduce((sum, ri) => sum + ri.weight, 0);
  if (totalWeight === 0) {
    return (Object.keys(RADAR_LABELS) as RadarDimension[]).map((dim) => ({
      dimension: dim,
      label: RADAR_LABELS[dim],
      value: 0,
    }));
  }

  const rawScores: Record<RadarDimension, number> = {
    fresh: 0,
    sweet: 0,
    woody: 0,
    spicy: 0,
    floral: 0,
    resinous: 0,
  };

  for (const ri of ingredients) {
    for (const dim of Object.keys(rawScores) as RadarDimension[]) {
      rawScores[dim] += ri.ingredient.attributes[dim] * ri.weight;
    }
  }

  let maxScore = 0;
  for (const dim of Object.keys(rawScores) as RadarDimension[]) {
    rawScores[dim] = rawScores[dim] / totalWeight;
    if (rawScores[dim] > maxScore) maxScore = rawScores[dim];
  }

  const scale = maxScore > 0 ? 100 / maxScore : 1;

  return (Object.keys(RADAR_LABELS) as RadarDimension[]).map((dim) => ({
    dimension: dim,
    label: RADAR_LABELS[dim],
    value: Math.round(rawScores[dim] * scale),
  }));
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
