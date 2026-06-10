import * as d3 from 'd3';
import { StateManager } from '../store';
import {
  CarbonEmission,
  CountryYearTotal,
  YearlyValue,
  filterByCountry,
  aggregateByCountryYear,
  getCountriesInContinents,
  getCountryTimeSeries,
} from '../utils/data';

const MARGIN = { top: 20, right: 24, bottom: 50, left: 60 };
const TRANSITION_DURATION = 300;

export function initLineChart(svgEl: SVGSVGElement, store: StateManager): void {
  const wrapper = svgEl.parentElement as HTMLElement;
  if (!wrapper) return;

  const titleEl = document.getElementById('lineChartTitle');
  const subtitleEl = document.getElementById('lineChartSubtitle');
  const svg = d3.select(svgEl);
  const tooltip = d3.select('#tooltip');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
  const xAxisG = g.append('g').attr('class', 'axis x-axis');
  const yAxisG = g.append('g').attr('class', 'axis y-axis');
  const gridG = g.append('g').attr('class', 'grid');
  const linesG = g.append('g').attr('class', 'lines');
  const dotsG = g.append('g').attr('class', 'dots');

  function getDimensions(): { width: number; height: number } {
    const rect = wrapper.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function prepareData(): Map<string, YearlyValue[]> {
    const state = store.getState();
    const data: CarbonEmission[] = state.allData;
    const seriesMap = new Map<string, YearlyValue[]>();

    if (state.selectedCountry) {
      const series = getCountryTimeSeries(data, state.selectedCountry);
      seriesMap.set(state.selectedCountry, series);
    } else {
      const countries = getCountriesInContinents(state.selectedContinents);
      const topCountries = countries.slice(0, 3);
      for (const country of topCountries) {
        seriesMap.set(country, getCountryTimeSeries(data, country));
      }
    }

    return seriesMap;
  }

  function updateTitle(): void {
    const state = store.getState();
    if (titleEl) {
      titleEl.textContent = state.selectedCountry
        ? `${state.selectedCountry} - 碳排放年度趋势`
        : '主要国家碳排放年度趋势';
    }
    if (subtitleEl) {
      subtitleEl.textContent = state.selectedCountry
        ? `展示${state.selectedCountry}从2000到2020年的碳排放量变化`
        : '展示筛选区域内排放量前3的国家趋势';
    }
  }

  function render(): void {
    updateTitle();
    const { width, height } = getDimensions();
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    const seriesMap = prepareData();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const allValues: number[] = [];
    seriesMap.forEach((series) => {
      series.forEach((d) => allValues.push(d.value));
    });

    const xScale = d3
      .scaleLinear()
      .domain([2000, 2020])
      .range([0, innerWidth]);

    const yMax = allValues.length > 0 ? d3.max(allValues) || 100 : 100;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0])
      .nice();

    xAxisG
      .attr('transform', `translate(0,${innerHeight})`)
      .transition()
      .duration(TRANSITION_DURATION)
      .call(d3.axisBottom(xScale).ticks(7).tickFormat(d3.format('d')));

    yAxisG
      .transition()
      .duration(TRANSITION_DURATION)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d} Mt`));

    gridG
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
    gridG.select('.domain').remove();

    const colors = ['#00b4d8', '#e94560', '#ffd166', '#06d6a0', '#b388ff'];
    const colorScale = d3.scaleOrdinal<string, string>().domain(Array.from(seriesMap.keys())).range(colors);

    const line = d3
      .line<YearlyValue>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const seriesData = Array.from(seriesMap.entries()).map(([country, values]) => ({
      country,
      values,
    }));

    const lineGroups = linesG
      .selectAll<SVGGElement, { country: string; values: YearlyValue[] }>('g.line-group')
      .data(seriesData, (d) => d.country);

    const exitingGroups = lineGroups.exit();
    exitingGroups
      .select<SVGPathElement>('path')
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('stroke-opacity', 0)
      .attr('stroke-dashoffset', function () {
        const self = this as SVGPathElement;
        const len = self.getTotalLength ? self.getTotalLength() : 0;
        return len;
      });
    exitingGroups.transition().duration(TRANSITION_DURATION).remove();

    const lineGroupsEnter = lineGroups.enter().append('g').attr('class', 'line-group');

    lineGroupsEnter
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => colorScale(d.country))
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round');

    const mergedGroups = lineGroupsEnter.merge(lineGroups);

    mergedGroups
      .select<SVGPathElement>('path')
      .datum((d) => d.values)
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('stroke', function () {
        const self = this as SVGPathElement;
        const parent = self.parentNode as SVGGElement;
        const datum = d3.select(parent).datum() as { country: string };
        return colorScale(datum.country);
      })
      .attr('d', line as any)
      .attr('stroke-opacity', 1)
      .attrTween('stroke-dasharray', function () {
        const self = this as SVGPathElement;
        const pathLength = self.getTotalLength ? self.getTotalLength() : 0;
        const interpolate = d3.interpolate(`0,${pathLength}`, `${pathLength},${pathLength}`);
        return (t: number) => interpolate(t);
      });

    const allDots: { country: string; year: number; value: number }[] = [];
    seriesMap.forEach((values, country) => {
      values.forEach((v) => allDots.push({ country, ...v }));
    });

    const dots = dotsG
      .selectAll<SVGCircleElement, { country: string; year: number; value: number }>('circle.dot')
      .data(allDots, (d) => `${d.country}-${d.year}`);

    dots
      .exit()
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('r', 0)
      .remove();

    const dotsEnter = dots
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => xScale(d.year))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 0)
      .attr('fill', (d) => colorScale(d.country))
      .attr('stroke', '#16213e')
      .attr('stroke-width', 1.5);

    dotsEnter
      .on('mouseenter', function () {
        d3.select(this).attr('r', 7);
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
            <div class="tooltip-line"><span class="tooltip-label">碳排放：</span><span class="tooltip-value">${d.value.toFixed(1)} Mt</span></div>
          `);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 4);
        tooltip.classed('visible', false);
      });

    dotsEnter
      .transition()
      .delay(TRANSITION_DURATION * 0.5)
      .duration(TRANSITION_DURATION * 0.5)
      .attr('r', 4);

    dots
      .transition()
      .duration(TRANSITION_DURATION)
      .attr('cx', (d) => xScale(d.year))
      .attr('cy', (d) => yScale(d.value))
      .attr('fill', (d) => colorScale(d.country))
      .attr('r', 4);
  }

  const resizeObserver = new ResizeObserver(() => render());
  resizeObserver.observe(wrapper);

  store.subscribe('yearChange', render);
  store.subscribe('continentChange', render);
  store.subscribe('countryChange', render);
  store.subscribe('reset', render);

  render();
}
