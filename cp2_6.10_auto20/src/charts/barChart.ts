import * as d3 from 'd3';
import { StateManager } from '../store';
import {
  CarbonEmission,
  CountryYearTotal,
  filterByYear,
  filterByContinents,
  aggregateByCountryYear,
} from '../utils/data';

interface BarDatum extends CountryYearTotal {
  fillId: string;
}

const MARGIN = { top: 20, right: 24, bottom: 60, left: 60 };
const TRANSITION_DURATION = 300;

export function initBarChart(svgEl: SVGSVGElement, store: StateManager): void {
  const wrapper = svgEl.parentElement as HTMLElement;
  if (!wrapper) return;

  const svg = d3.select(svgEl);
  const tooltip = d3.select('#tooltip');

  const defs = svg.append('defs');
  const gradient = defs
    .append('linearGradient')
    .attr('id', 'barGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');
  gradient.append('stop').attr('offset', '0%').attr('stop-color', '#e94560');
  gradient.append('stop').attr('offset', '100%').attr('stop-color', '#0f3460');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
  const xAxisG = g.append('g').attr('class', 'axis x-axis');
  const yAxisG = g.append('g').attr('class', 'axis y-axis');
  const barsG = g.append('g').attr('class', 'bars');
  const yGridG = g.append('g').attr('class', 'grid y-grid');

  function getDimensions(): { width: number; height: number } {
    const rect = wrapper.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function prepareData(): BarDatum[] {
    const state = store.getState();
    let data: CarbonEmission[] = state.allData;
    data = filterByYear(data, state.selectedYear);
    data = filterByContinents(data, state.selectedContinents);
    const aggregated = aggregateByCountryYear(data);
    return aggregated.map((d) => ({ ...d, fillId: 'barGradient' }));
  }

  function render(): void {
    const { width, height } = getDimensions();
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    const data = prepareData();
    const state = store.getState();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const xScale = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.country))
      .range([0, innerWidth])
      .padding(0.25);

    const yMax = data.length > 0 ? d3.max(data, (d) => d.total) || 100 : 100;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0])
      .nice();

    xAxisG
      .attr('transform', `translate(0,${innerHeight})`)
      .transition()
      .duration(TRANSITION_DURATION)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    yAxisG
      .transition()
      .duration(TRANSITION_DURATION)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d} Mt`));

    yGridG
      .transition()
      .duration(TRANSITION_DURATION)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#2a2a4e')
      .attr('stroke-opacity', 0.6);
    yGridG.select('.domain').remove();

    const bars = barsG.selectAll<SVGRectElement, BarDatum>('rect.bar').data(data, (d) => d.country);

    bars
      .exit()
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('height', 0)
      .attr('y', innerHeight)
      .remove();

    const barsEnter = bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.country) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('fill', 'url(#barGradient)')
      .attr('rx', 3);

    barsEnter
      .on('click', (event, d) => {
        event.stopPropagation();
        const current = store.getState().selectedCountry;
        store.setCountry(current === d.country ? null : d.country);
      })
      .on('mouseenter', function () {
        d3.select(this).style('opacity', '0.8');
      })
      .on('mousemove', (event, d) => {
        const wrapperRect = wrapper.getBoundingClientRect();
        const x = event.clientX - wrapperRect.left + 14;
        const y = event.clientY - wrapperRect.top - 10;
        tooltip
          .classed('visible', true)
          .style('left', `${x}px`)
          .style('top', `${y}px`).html(`
            <div class="tooltip-line"><span class="tooltip-label">国家：</span><span class="tooltip-value">${d.country}</span></div>
            <div class="tooltip-line"><span class="tooltip-label">年份：</span><span class="tooltip-value">${d.year}</span></div>
            <div class="tooltip-line"><span class="tooltip-label">碳排放：</span><span class="tooltip-value">${d.total.toFixed(1)} Mt</span></div>
          `);
      })
      .on('mouseleave', function () {
        d3.select(this).style('opacity', '1');
        tooltip.classed('visible', false);
      });

    const merged = barsEnter.merge(bars);

    merged
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('x', (d) => xScale(d.country) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', (d) => yScale(d.total))
      .attr('height', (d) => innerHeight - yScale(d.total));

    merged.classed('selected', (d) => state.selectedCountry === d.country);
  }

  const resizeObserver = new ResizeObserver(() => render());
  resizeObserver.observe(wrapper);

  store.subscribe('yearChange', render);
  store.subscribe('continentChange', render);
  store.subscribe('countryChange', render);
  store.subscribe('reset', render);

  svg.on('click', () => {
    if (store.getState().selectedCountry !== null) {
      store.setCountry(null);
    }
  });

  render();
}
