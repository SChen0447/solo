import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import {
  TemperatureRecord,
  getCityColor,
  CITY_LIST,
} from '../data/temperatureData'
import { ChartType } from '../main'

interface ChartPanelProps {
  cities: string[]
  data: TemperatureRecord[]
  chartType: ChartType
  monthRange: [number, number]
}

interface TooltipData {
  city: string
  month: number
  avgTemp: number
  highTemp: number
  lowTemp: number
}

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

const MARGIN = { top: 40, right: 40, bottom: 60, left: 60 }

export default function ChartPanel({
  cities,
  data,
  chartType,
  monthRange,
}: ChartPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(width - 20, 400),
          height: 500,
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const activeMonths = (() => {
    const months: number[] = []
    if (monthRange[0] <= monthRange[1]) {
      for (let m = monthRange[0]; m <= monthRange[1]; m++) months.push(m)
    } else {
      for (let m = monthRange[0]; m <= 12; m++) months.push(m)
      for (let m = 1; m <= monthRange[1]; m++) months.push(m)
    }
    return months
  })()

  const allCities = CITY_LIST

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const innerWidth = dimensions.width - MARGIN.left - MARGIN.right
    const innerHeight = dimensions.height - MARGIN.top - MARGIN.bottom

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
      .style('opacity', 0)

    g.transition().duration(300).style('opacity', 1)

    if (chartType === 'box') {
      renderBoxPlot(g, innerWidth, innerHeight)
    } else if (chartType === 'line') {
      renderLineChart(g, innerWidth, innerHeight)
    } else {
      renderHeatmap(g, innerWidth, innerHeight)
    }
  }, [data, cities, chartType, monthRange, dimensions])

  const showTooltip = (d: TooltipData, event: React.MouseEvent | MouseEvent) => {
    setTooltip(d)
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      setTooltipPos({
        x: event.clientX - rect.left + 15,
        y: event.clientY - rect.top - 10,
      })
    }
  }

  const hideTooltip = () => {
    setTooltip(null)
  }

  function renderBoxPlot(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    innerWidth: number,
    innerHeight: number
  ) {
    const yScale = d3.scaleLinear().domain([-20, 50]).range([innerHeight, 0])

    const x0 = d3
      .scaleBand()
      .domain(activeMonths.map(String))
      .range([0, innerWidth])
      .paddingInner(0.15)

    const x1 = d3
      .scaleBand()
      .domain(allCities)
      .range([0, x0.bandwidth()])
      .padding(0.05)

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(x0)
          .tickFormat((d) => MONTH_NAMES[parseInt(d, 10) - 1])
      )
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '12px')

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat((d) => `${d}°C`))
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '12px')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '13px')
      .style('fill', '#34495E')
      .text('温度 (°C)')

    for (const month of activeMonths) {
      const monthData = data.filter((d) => d.month === month)

      for (const city of allCities) {
        const cityData = monthData.filter((d) => d.city === city)
        if (cityData.length === 0) continue

        const isSelected = cities.includes(city)
        const color = getCityColor(city)
        const opacity = isSelected ? 0.7 : 0.2

        const temps = cityData.map((d) => d.avgTemp).sort(d3.ascending)
        const q1 = d3.quantile(temps, 0.25) as number
        const median = d3.quantile(temps, 0.5) as number
        const q3 = d3.quantile(temps, 0.75) as number
        const iqr = q3 - q1
        const min = d3.min(temps.filter((t) => t >= q1 - 1.5 * iqr)) as number
        const max = d3.max(temps.filter((t) => t <= q3 + 1.5 * iqr)) as number
        const outliers = temps.filter((t) => t < q1 - 1.5 * iqr || t > q3 + 1.5 * iqr)

        const baseX = x0(String(month)) ?? 0
        const cityX = (x1(city) ?? 0) + baseX
        const boxWidth = x1.bandwidth()

        const boxGroup = g.append('g')

        boxGroup
          .append('line')
          .attr('x1', cityX + boxWidth / 2)
          .attr('x2', cityX + boxWidth / 2)
          .attr('y1', yScale(min))
          .attr('y2', yScale(max))
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('opacity', opacity)

        boxGroup
          .append('rect')
          .attr('x', cityX)
          .attr('y', yScale(q3))
          .attr('width', boxWidth)
          .attr('height', yScale(q1) - yScale(q3))
          .attr('fill', color)
          .attr('fill-opacity', opacity)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .on('mouseover', (event: MouseEvent) => {
            showTooltip(
              {
                city,
                month,
                avgTemp: +d3.mean(cityData, (d) => d.avgTemp)!.toFixed(1),
                highTemp: +d3.max(cityData, (d) => d.highTemp)!.toFixed(1),
                lowTemp: +d3.min(cityData, (d) => d.lowTemp)!.toFixed(1),
              },
              event
            )
          })
          .on('mousemove', (event: MouseEvent) => {
            showTooltip(
              {
                city,
                month,
                avgTemp: +d3.mean(cityData, (d) => d.avgTemp)!.toFixed(1),
                highTemp: +d3.max(cityData, (d) => d.highTemp)!.toFixed(1),
                lowTemp: +d3.min(cityData, (d) => d.lowTemp)!.toFixed(1),
              },
              event
            )
          })
          .on('mouseout', hideTooltip)

        boxGroup
          .append('line')
          .attr('x1', cityX)
          .attr('x2', cityX + boxWidth)
          .attr('y1', yScale(median))
          .attr('y2', yScale(median))
          .attr('stroke', '#2C3E50')
          .attr('stroke-width', 2)
          .attr('opacity', isSelected ? 1 : 0.4)

        boxGroup
          .append('line')
          .attr('x1', cityX + boxWidth / 4)
          .attr('x2', cityX + (3 * boxWidth) / 4)
          .attr('y1', yScale(min))
          .attr('y2', yScale(min))
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('opacity', opacity)

        boxGroup
          .append('line')
          .attr('x1', cityX + boxWidth / 4)
          .attr('x2', cityX + (3 * boxWidth) / 4)
          .attr('y1', yScale(max))
          .attr('y2', yScale(max))
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('opacity', opacity)

        for (const outlier of outliers) {
          boxGroup
            .append('circle')
            .attr('cx', cityX + boxWidth / 2)
            .attr('cy', yScale(outlier))
            .attr('r', 3.5)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('opacity', opacity)
        }
      }
    }

    const legend = g
      .append('g')
      .attr('transform', `translate(0, -30)`)

    allCities.forEach((city, i) => {
      const isSelected = cities.includes(city)
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(${i * 85}, 0)`)

      legendItem
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', getCityColor(city))
        .attr('fill-opacity', isSelected ? 0.7 : 0.2)
        .attr('stroke', getCityColor(city))
        .attr('stroke-width', 1)

      legendItem
        .append('text')
        .attr('x', 18)
        .attr('y', 10)
        .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
        .style('font-size', '12px')
        .style('fill', isSelected ? getCityColor(city) : '#BDC3C7')
        .text(city)
    })
  }

  function renderLineChart(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    innerWidth: number,
    innerHeight: number
  ) {
    const yScale = d3.scaleLinear().domain([-20, 50]).range([innerHeight, 0])

    const xScale = d3
      .scalePoint()
      .domain(activeMonths.map(String))
      .range([20, innerWidth - 20])

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => MONTH_NAMES[parseInt(d, 10) - 1])
      )
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '12px')

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat((d) => `${d}°C`))
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '12px')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '13px')
      .style('fill', '#34495E')
      .text('温度 (°C)')

    const line = d3
      .line<{ month: number; avgTemp: number }>()
      .x((d) => xScale(String(d.month)) ?? 0)
      .y((d) => yScale(d.avgTemp))
      .curve(d3.curveMonotoneX)

    for (const city of allCities) {
      const isSelected = cities.includes(city)
      const color = getCityColor(city)
      const opacity = isSelected ? 1 : 0.2

      const cityData = data.filter((d) => d.city === city)
      if (cityData.length === 0) continue

      const monthAvgs = activeMonths.map((month) => {
        const monthData = cityData.filter((d) => d.month === month)
        return {
          month,
          avgTemp: monthData.length > 0 ? d3.mean(monthData, (d) => d.avgTemp)! : 0,
          highTemp: monthData.length > 0 ? d3.max(monthData, (d) => d.highTemp)! : 0,
          lowTemp: monthData.length > 0 ? d3.min(monthData, (d) => d.lowTemp)! : 0,
        }
      }).filter((d) => d.avgTemp !== undefined)

      g.append('path')
        .datum(monthAvgs)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('opacity', opacity)
        .attr('d', line)

      for (const d of monthAvgs) {
        g.append('circle')
          .attr('cx', xScale(String(d.month)) ?? 0)
          .attr('cy', yScale(d.avgTemp))
          .attr('r', isSelected ? 5 : 3)
          .attr('fill', isSelected ? color : '#FFFFFF')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('opacity', opacity)
          .on('mouseover', (event: MouseEvent) => {
            showTooltip(
              {
                city,
                month: d.month,
                avgTemp: +d.avgTemp.toFixed(1),
                highTemp: +d.highTemp.toFixed(1),
                lowTemp: +d.lowTemp.toFixed(1),
              },
              event
            )
          })
          .on('mousemove', (event: MouseEvent) => {
            showTooltip(
              {
                city,
                month: d.month,
                avgTemp: +d.avgTemp.toFixed(1),
                highTemp: +d.highTemp.toFixed(1),
                lowTemp: +d.lowTemp.toFixed(1),
              },
              event
            )
          })
          .on('mouseout', hideTooltip)
      }
    }

    const legend = g
      .append('g')
      .attr('transform', `translate(0, -30)`)

    allCities.forEach((city, i) => {
      const isSelected = cities.includes(city)
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(${i * 85}, 0)`)

      legendItem
        .append('line')
        .attr('x1', 0)
        .attr('x2', 12)
        .attr('y1', 6)
        .attr('y2', 6)
        .attr('stroke', getCityColor(city))
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('opacity', isSelected ? 1 : 0.2)

      legendItem
        .append('circle')
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('r', isSelected ? 4 : 2)
        .attr('fill', isSelected ? getCityColor(city) : '#FFFFFF')
        .attr('stroke', getCityColor(city))
        .attr('stroke-width', 1.5)
        .attr('opacity', isSelected ? 1 : 0.2)

      legendItem
        .append('text')
        .attr('x', 18)
        .attr('y', 10)
        .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
        .style('font-size', '12px')
        .style('fill', isSelected ? getCityColor(city) : '#BDC3C7')
        .text(city)
    })
  }

  function renderHeatmap(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    innerWidth: number,
    innerHeight: number
  ) {
    const displayCities = cities.length > 0 ? cities : allCities

    const xScale = d3
      .scaleBand()
      .domain(activeMonths.map(String))
      .range([50, innerWidth])

    const yScale = d3
      .scaleBand()
      .domain(displayCities)
      .range([0, innerHeight - 40])

    const colorScale = d3
      .scaleLinear<string>()
      .domain([-10, 0, 15, 30, 45])
      .range(['#2E86C1', '#85C1E9', '#F9E79F', '#F5B041', '#E74C3C'])

    g.append('g')
      .attr('transform', `translate(0,${innerHeight - 40})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => MONTH_NAMES[parseInt(d, 10) - 1])
      )
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '12px')

    g.append('g')
      .attr('transform', 'translate(50,0)')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '12px')

    for (const city of displayCities) {
      for (const month of activeMonths) {
        const cellData = data.filter((d) => d.city === city && d.month === month)
        if (cellData.length === 0) continue

        const avgTemp = d3.mean(cellData, (d) => d.avgTemp)!
        const highTemp = d3.max(cellData, (d) => d.highTemp)!
        const lowTemp = d3.min(cellData, (d) => d.lowTemp)!

        const cx = xScale(String(month)) ?? 0
        const cy = yScale(city) ?? 0
        const w = xScale.bandwidth() - 2
        const h = yScale.bandwidth() - 2

        g.append('rect')
          .attr('x', cx + 1)
          .attr('y', cy + 1)
          .attr('width', w)
          .attr('height', h)
          .attr('rx', 2)
          .attr('ry', 2)
          .attr('fill', colorScale(avgTemp))
          .attr('opacity', 0.9)
          .on('mouseover', (event: MouseEvent) => {
            showTooltip(
              {
                city,
                month,
                avgTemp: +avgTemp.toFixed(1),
                highTemp: +highTemp.toFixed(1),
                lowTemp: +lowTemp.toFixed(1),
              },
              event
            )
          })
          .on('mousemove', (event: MouseEvent) => {
            showTooltip(
              {
                city,
                month,
                avgTemp: +avgTemp.toFixed(1),
                highTemp: +highTemp.toFixed(1),
                lowTemp: +lowTemp.toFixed(1),
              },
              event
            )
          })
          .on('mouseout', hideTooltip)

        g.append('text')
          .attr('x', cx + w / 2 + 1)
          .attr('y', cy + h / 2 + 5)
          .attr('text-anchor', 'middle')
          .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
          .style('font-size', '11px')
          .style('fill', avgTemp > 25 || avgTemp < 5 ? '#FFFFFF' : '#2C3E50')
          .style('pointer-events', 'none')
          .text(avgTemp.toFixed(1))
      }
    }

    const legendW = 250
    const legendH = 15
    const legendX = innerWidth - legendW - 10
    const legendY = innerHeight - 25

    const legendScale = d3
      .scaleLinear()
      .domain([-10, 45])
      .range([0, legendW])

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat((d) => `${d}°C`)

    const legendGrad = svgRef.current && d3
      .select(svgRef.current)
      .append('defs')
      .append('linearGradient')
      .attr('id', 'heatmap-grad')
      .attr('x1', '0%')
      .attr('x2', '100%')

    if (legendGrad) {
      legendGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2E86C1')
      legendGrad.append('stop').attr('offset', '25%').attr('stop-color', '#85C1E9')
      legendGrad.append('stop').attr('offset', '50%').attr('stop-color', '#F9E79F')
      legendGrad.append('stop').attr('offset', '75%').attr('stop-color', '#F5B041')
      legendGrad.append('stop').attr('offset', '100%').attr('stop-color', '#E74C3C')
    }

    const legendG = g.append('g').attr('transform', `translate(${legendX},${legendY})`)

    legendG
      .append('rect')
      .attr('width', legendW)
      .attr('height', legendH)
      .attr('fill', 'url(#heatmap-grad)')
      .attr('rx', 2)

    legendG
      .append('g')
      .attr('transform', `translate(0,${legendH})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .style('font-size', '10px')

    legendG.selectAll('.domain, .tick line').remove()
  }

  return (
    <div className="chart-panel" ref={containerRef}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
      />
      {tooltip && (
        <div
          ref={tooltipRef}
          className="d3-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          <div className="tooltip-city" style={{ color: getCityColor(tooltip.city) }}>
            {tooltip.city}
          </div>
          <div className="tooltip-month">{MONTH_NAMES[tooltip.month - 1]}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">平均气温:</span>
            <span className="tooltip-value">{tooltip.avgTemp}°C</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">最高气温:</span>
            <span className="tooltip-value" style={{ color: '#E74C3C' }}>
              {tooltip.highTemp}°C
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">最低气温:</span>
            <span className="tooltip-value" style={{ color: '#2E86C1' }}>
              {tooltip.lowTemp}°C
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
