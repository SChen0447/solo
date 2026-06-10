import { StateManager } from './store';
import { generateMockData } from './utils/data';
import { initControls } from './controls/controls';
import { initBarChart } from './charts/barChart';
import { initLineChart } from './charts/lineChart';

function bootstrap(): void {
  const allData = generateMockData();
  const store = new StateManager(allData);

  const controlsEl = document.getElementById('controls');
  const barChartEl = document.getElementById('barChart') as SVGSVGElement | null;
  const lineChartEl = document.getElementById('lineChart') as SVGSVGElement | null;

  if (controlsEl) {
    initControls(controlsEl, store);
  }

  if (barChartEl) {
    initBarChart(barChartEl, store);
  }

  if (lineChartEl) {
    initLineChart(lineChartEl, store);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
