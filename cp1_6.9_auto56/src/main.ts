import * as L from 'leaflet';
import { MapRenderer } from './mapRenderer';
import { TimelineController } from './timelineController';
import { EventManager } from './eventManager';
import { Sidebar } from './sidebar';
import { civilizations, historicalEvents, culturalWorks, yearSummaries } from './data';

const DEFAULT_YEAR = 1000;

function initMap(): L.Map {
  const map = L.map('map', {
    center: [30, 60],
    zoom: 3,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  return map;
}

function main(): void {
  const map = initMap();

  const mapRenderer = new MapRenderer(map, civilizations);
  const timelineController = new TimelineController(yearSummaries);
  const eventManager = new EventManager(map, historicalEvents);
  const sidebar = new Sidebar(culturalWorks);

  mapRenderer.renderForYear(DEFAULT_YEAR);
  eventManager.renderForYear(DEFAULT_YEAR);

  timelineController.onYearChange((year: number) => {
    mapRenderer.renderForYear(year);
    eventManager.renderForYear(year);
    sidebar.updateForYear(year);
  });

  sidebar.onWorkSelect((civilizationId: string) => {
    mapRenderer.highlightCivilization(civilizationId);
  });
}

document.addEventListener('DOMContentLoaded', main);
