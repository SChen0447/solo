import * as L from 'leaflet';
import * as d3 from 'd3';
import type { Civilization } from './data';

export class MapRenderer {
  private map: L.Map;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private currentPaths: d3.Selection<SVGPathElement, Civilization, SVGGElement, unknown> | null = null;
  private civilizations: Civilization[];

  constructor(map: L.Map, civilizations: Civilization[]) {
    this.map = map;
    this.civilizations = civilizations;
    this.initSvgLayer();
    this.map.on('moveend zoomend resize', () => this.updateProjection());
  }

  private initSvgLayer(): void {
    const overlayPane = this.map.getPanes().overlayPane;
    this.svg = d3.select(overlayPane)
      .append('svg')
      .attr('class', 'leaflet-zoom-hide')
      .style('width', '100%')
      .style('height', '100%')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('pointer-events', 'none');

    this.g = this.svg.append('g').attr('class', 'leaflet-zoom-hide');
  }

  private projectPoint = (lng: number, lat: number): L.Point => {
    return this.map.latLngToLayerPoint(new L.LatLng(lat, lng));
  };

  private geoPath: d3.GeoPath<any, d3.GeoPermissibleObjects> = d3.geoPath().projection({
    stream: (s) => {
      return {
        point: (lng: number, lat: number) => {
          const p = this.projectPoint(lng, lat);
          s.point(p.x, p.y);
        },
        sphere: () => s.sphere && s.sphere(),
        lineStart: () => s.lineStart && s.lineStart(),
        lineEnd: () => s.lineEnd && s.lineEnd(),
        polygonStart: () => s.polygonStart && s.polygonStart(),
        polygonEnd: () => s.polygonEnd && s.polygonEnd()
      };
    }
  });

  private updateProjection(): void {
    if (!this.currentPaths) return;
    this.currentPaths.attr('d', (d) => this.geoPath(d.geometry) || '');
  }

  public renderForYear(year: number): void {
    const activeCivs = this.civilizations.filter(
      (c) => year >= c.startYear && year <= c.endYear
    );

    if (!this.g) return;

    if (this.currentPaths) {
      this.currentPaths
        .transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    }

    const paths = this.g
      .selectAll<SVGPathElement, Civilization>('path.civ-region')
      .data(activeCivs, (d) => d.id);

    paths.exit()
      .transition()
      .duration(500)
      .style('opacity', 0)
      .remove();

    const newPaths = paths.enter()
      .append('path')
      .attr('class', 'civ-region civ-path')
      .attr('data-civ-id', (d) => d.id)
      .attr('d', (d) => this.geoPath(d.geometry) || '')
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#fff8dc')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.9)
      .style('opacity', 0)
      .style('pointer-events', 'auto')
      .style('cursor', 'pointer')
      .append('title')
      .text((d) => d.name);

    this.g.selectAll<SVGPathElement, Civilization>('path.civ-region')
      .transition()
      .delay((_, i) => i * 30)
      .duration(500)
      .style('opacity', 1);

    this.currentPaths = this.g.selectAll<SVGPathElement, Civilization>('path.civ-region');
  }

  public highlightCivilization(civId: string): void {
    if (!this.g) return;

    this.g.selectAll<SVGPathElement, Civilization>('path.civ-region')
      .filter((d) => d.id === civId)
      .classed('civ-highlight', true);

    setTimeout(() => {
      this.g?.selectAll<SVGPathElement, Civilization>('path.civ-region')
        .classed('civ-highlight', false);
    }, 3000);
  }
}
