import * as d3 from 'd3';
import type { ImageryData, ImageryNode, ImageryLink, EmotionCategory } from './data';

export interface RendererOptions {
  container: SVGElement;
  tooltipElement: HTMLElement;
  onNodeClick: (node: ImageryNode) => void;
  onNodeHover?: (node: ImageryNode | null, event?: MouseEvent) => void;
}

interface SimulatedNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  frequency: number;
  emotion: EmotionCategory;
}

interface SimulatedLink extends d3.SimulationLinkDatum<SimulatedNode> {
  strength: number;
}

type Simulation = d3.Simulation<SimulatedNode, SimulatedLink>;

export class GraphRenderer {
  private svg: d3.Selection<SVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

  private tooltip: d3.Selection<HTMLElement, unknown, null, undefined>;
  private simulation!: Simulation;
  private zoom: d3.ZoomBehavior<SVGElement, unknown>;

  private width: number = 0;
  private height: number = 0;
  private nodeRadiusScale!: d3.ScaleLinear<number, number>;
  private linkWidthScale!: d3.ScaleLinear<number, number>;

  private nodes: SimulatedNode[] = [];
  private links: SimulatedLink[] = [];
  private highlightedNodeIds: Set<string> = new Set();
  private onNodeClick: (node: ImageryNode) => void;
  private onNodeHover?: (node: ImageryNode | null, event?: MouseEvent) => void;

  private transitionDuration = 600;
  private minFrequency = 50;
  private maxFrequency = 350;
  private minRadius = 10;
  private maxRadius = 45;

  constructor(options: RendererOptions) {
    this.svg = d3.select(options.container);
    this.tooltip = d3.select(options.tooltipElement);
    this.onNodeClick = options.onNodeClick;
    this.onNodeHover = options.onNodeHover;

    this.zoom = d3.zoom<SVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    this.g = this.svg.append('g').attr('class', 'graph-group');
    this.linkGroup = this.g.append('g').attr('class', 'links');
    this.nodeGroup = this.g.append('g').attr('class', 'nodes');
    this.labelGroup = this.g.append('g').attr('class', 'labels');

    this.updateSize();
    this.initScales();
    this.initSimulation();
    this.setupResizeHandler();
  }

  private updateSize(): void {
    const container = this.svg.node()?.parentElement;
    if (container) {
      this.width = container.clientWidth;
      this.height = container.clientHeight;
      this.svg
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('viewBox', [0, 0, this.width, this.height]);
    }
  }

  private initScales(): void {
    this.nodeRadiusScale = d3
      .scaleLinear()
      .domain([this.minFrequency, this.maxFrequency])
      .range([this.getMinRadius(), this.getMaxRadius()])
      .clamp(true);

    this.linkWidthScale = d3
      .scaleLinear()
      .domain([1, 8])
      .range([1, 5])
      .clamp(true);
  }

  private getMinRadius(): number {
    if (this.width < 768) return 6;
    if (this.width < 1024) return 8;
    return this.minRadius;
  }

  private getMaxRadius(): number {
    if (this.width < 768) return 28;
    if (this.width < 1024) return 36;
    return this.maxRadius;
  }

  private getFontSize(): number {
    if (this.width < 768) return 10;
    if (this.width < 1024) return 12;
    return 13;
  }

  private initSimulation(): void {
    this.simulation = d3
      .forceSimulation<SimulatedNode>([])
      .force(
        'link',
        d3
          .forceLink<SimulatedNode, SimulatedLink>([])
          .id((d) => d.id)
          .distance((d) => 80 + (1 - d.strength / 8) * 60)
          .strength((d) => 0.3 + (d.strength / 8) * 0.4)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide<SimulatedNode>().radius((d) => this.nodeRadiusScale(d.frequency) + 8))
      .alphaDecay(0.03)
      .velocityDecay(0.4);
  }

  private setupResizeHandler(): void {
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.updateSize();
        this.initScales();
        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(0.3).restart();
        this.updateLabelsPosition();
      }, 200);
    });
  }

  private getNodeColor(node: SimulatedNode): string {
    switch (node.emotion) {
      case 'positive':
        return `url(#gradient-positive-${node.id})`;
      case 'negative':
        return `url(#gradient-negative-${node.id})`;
      default:
        return '#bdc3c7';
    }
  }

  private createGradients(nodes: SimulatedNode[]): void {
    let defs = this.svg.select<SVGDefsElement>('defs');
    if (defs.empty()) {
      defs = this.svg.append('defs');
    }
    defs.selectAll('*').remove();

    nodes.forEach((node) => {
      if (node.emotion === 'positive') {
        const grad = defs
          .append('radialGradient')
          .attr('id', `gradient-positive-${node.id}`)
          .attr('cx', '30%')
          .attr('cy', '30%');

        grad.append('stop').attr('offset', '0%').attr('stop-color', '#f7b731');
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#e74c3c');
      } else if (node.emotion === 'negative') {
        const grad = defs
          .append('radialGradient')
          .attr('id', `gradient-negative-${node.id}`)
          .attr('cx', '30%')
          .attr('cy', '30%');

        grad.append('stop').attr('offset', '0%').attr('stop-color', '#3498db');
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#8e44ad');
      }
    });
  }

  public render(data: ImageryData, isInitialLoad: boolean = false): void {
    this.nodes = data.nodes.map((n) => ({ ...n }));
    this.links = data.links.map((l) => ({ ...l, strength: l.strength }));

    this.createGradients(this.nodes);

    this.updateLinks(isInitialLoad);
    this.updateNodes(isInitialLoad);
    this.updateLabels(isInitialLoad);

    this.simulation.nodes(this.nodes);
    (this.simulation.force('link') as d3.ForceLink<SimulatedNode, SimulatedLink>).links(this.links);

    this.simulation.alpha(isInitialLoad ? 1 : 0.8).restart();
  }

  private updateLinks(isInitialLoad: boolean): void {
    const linkSelection = this.linkGroup
      .selectAll<SVGLineElement, SimulatedLink>('line')
      .data(this.links, (d) => `${typeof d.source === 'object' ? d.source.id : d.source}-${typeof d.target === 'object' ? d.target.id : d.target}`);

    linkSelection.exit().remove();

    const newLinks = linkSelection
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#ccc')
      .attr('stroke-opacity', isInitialLoad ? 0 : 0.4)
      .attr('stroke-width', (d) => this.linkWidthScale(d.strength));

    if (isInitialLoad) {
      newLinks
        .transition()
        .delay((_, i) => i * 5)
        .duration(this.transitionDuration)
        .attr('stroke-opacity', 0.4);
    }

    const allLinks = newLinks.merge(linkSelection);

    if (!isInitialLoad) {
      allLinks
        .transition()
        .duration(this.transitionDuration)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', (d) => this.linkWidthScale(d.strength));
    }
  }

  private updateNodes(isInitialLoad: boolean): void {
    const self = this;

    const nodeSelection = this.nodeGroup
      .selectAll<SVGGElement, SimulatedNode>('g.node')
      .data(this.nodes, (d) => d.id);

    nodeSelection.exit().remove();

    const newNodes = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    newNodes
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d) => this.getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', isInitialLoad ? 0 : 1);

    if (isInitialLoad) {
      newNodes
        .selectAll<SVGCircleElement, SimulatedNode>('circle')
        .transition()
        .delay((_, i) => i * 8)
        .duration(this.transitionDuration)
        .ease(d3.easeElasticOut.amplitude(1).period(0.5))
        .attr('r', (d) => this.nodeRadiusScale(d.frequency))
        .attr('opacity', 1);
    } else {
      newNodes
        .selectAll<SVGCircleElement, SimulatedNode>('circle')
        .transition()
        .duration(this.transitionDuration)
        .attr('r', (d) => this.nodeRadiusScale(d.frequency));
    }

    const allNodes = newNodes.merge(nodeSelection);

    allNodes
      .selectAll<SVGCircleElement, SimulatedNode>('circle')
      .transition()
      .duration(this.transitionDuration)
      .attr('fill', (d) => this.getNodeColor(d))
      .attr('r', (d) => this.nodeRadiusScale(d.frequency));

    allNodes.call(this.createDragBehavior());

    allNodes
      .on('mouseover', function (event: MouseEvent, d: SimulatedNode) {
        d3.select(this).select('circle').attr('stroke-width', 4);
        self.showTooltip(d, event);
        if (self.onNodeHover) self.onNodeHover(d, event);
      })
      .on('mousemove', (event: MouseEvent, d: SimulatedNode) => {
        this.showTooltip(d, event);
      })
      .on('mouseout', function () {
        d3.select(this).select('circle').attr('stroke-width', 2);
        self.hideTooltip();
        if (self.onNodeHover) self.onNodeHover(null);
      })
      .on('click', (_, d: SimulatedNode) => {
        this.onNodeClick(d);
      });
  }

  private updateLabels(isInitialLoad: boolean): void {
    const labelSelection = this.labelGroup
      .selectAll<SVGTextElement, SimulatedNode>('text')
      .data(this.nodes, (d) => d.id);

    labelSelection.exit().remove();

    const newLabels = labelSelection
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('pointer-events', 'none')
      .attr('fill', '#2c3e50')
      .attr('font-size', this.getFontSize())
      .attr('font-weight', '600')
      .attr('font-family', "'Songti SC', 'STSong', 'SimSun', serif")
      .attr('opacity', isInitialLoad ? 0 : 1)
      .text((d) => d.name);

    if (isInitialLoad) {
      newLabels
        .transition()
        .delay((_, i) => i * 8 + 200)
        .duration(this.transitionDuration)
        .attr('opacity', 1);
    }
  }

  private updateLabelsPosition(): void {
    this.labelGroup
      .selectAll<SVGTextElement, SimulatedNode>('text')
      .attr('font-size', this.getFontSize());
  }

  private createDragBehavior(): d3.DragBehavior<SVGGElement, SimulatedNode, d3.SubjectPosition> {
    const self = this;

    function dragstarted(event: d3.D3DragEvent<SVGGElement, SimulatedNode, d3.SubjectPosition>, d: SimulatedNode) {
      if (!event.active) self.simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SimulatedNode, d3.SubjectPosition>, d: SimulatedNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, SimulatedNode, d3.SubjectPosition>, d: SimulatedNode) {
      if (!event.active) self.simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3
      .drag<SVGGElement, SimulatedNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  private showTooltip(node: SimulatedNode, event: MouseEvent): void {
    const emotionLabels: Record<EmotionCategory, string> = {
      positive: '积极意象',
      negative: '消极意象',
      neutral: '中性意象'
    };

    const html = `
      <div class="tooltip-name">${node.name}</div>
      <div class="tooltip-info">出现频率：${node.frequency} 次</div>
      <div class="tooltip-info">情感分类：${emotionLabels[node.emotion]}</div>
    `;

    this.tooltip.html(html).classed('visible', true);

    const container = this.svg.node()?.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const tooltipRect = this.tooltip.node()?.getBoundingClientRect();
    if (!tooltipRect) return;

    let x = event.clientX - rect.left + 15;
    let y = event.clientY - rect.top + 15;

    if (x + tooltipRect.width > rect.width - 10) {
      x = event.clientX - rect.left - tooltipRect.width - 15;
    }
    if (y + tooltipRect.height > rect.height - 10) {
      y = event.clientY - rect.top - tooltipRect.height - 15;
    }

    this.tooltip.style('left', `${x}px`).style('top', `${y}px`);
  }

  private hideTooltip(): void {
    this.tooltip.classed('visible', false);
  }

  public highlightSearch(matchedNodeIds: string[]): void {
    this.highlightedNodeIds = new Set(matchedNodeIds);

    const hasMatch = matchedNodeIds.length > 0;

    this.nodeGroup
      .selectAll<SVGGElement, SimulatedNode>('g.node')
      .selectAll<SVGCircleElement, SimulatedNode>('circle')
      .transition()
      .duration(150)
      .attr('opacity', (d) => (hasMatch ? (this.highlightedNodeIds.has(d.id) ? 1 : 0.15) : 1));

    this.labelGroup
      .selectAll<SVGTextElement, SimulatedNode>('text')
      .transition()
      .duration(150)
      .attr('opacity', (d) => (hasMatch ? (this.highlightedNodeIds.has(d.id) ? 1 : 0.15) : 1));

    this.linkGroup
      .selectAll<SVGLineElement, SimulatedLink>('line')
      .transition()
      .duration(150)
      .attr('stroke-opacity', (d) => {
        if (!hasMatch) return 0.4;
        const sourceId = typeof d.source === 'object' ? d.source.id : String(d.source);
        const targetId = typeof d.target === 'object' ? d.target.id : String(d.target);
        const isConnected = this.highlightedNodeIds.has(sourceId) || this.highlightedNodeIds.has(targetId);
        return isConnected ? 0.6 : 0.05;
      });
  }

  public startTick(): void {
    const self = this;

    this.simulation.on('tick', () => {
      self.linkGroup
        .selectAll<SVGLineElement, SimulatedLink>('line')
        .attr('x1', (d) => (typeof d.source === 'object' ? (d.source as SimulatedNode).x ?? 0 : 0))
        .attr('y1', (d) => (typeof d.source === 'object' ? (d.source as SimulatedNode).y ?? 0 : 0))
        .attr('x2', (d) => (typeof d.target === 'object' ? (d.target as SimulatedNode).x ?? 0 : 0))
        .attr('y2', (d) => (typeof d.target === 'object' ? (d.target as SimulatedNode).y ?? 0 : 0));

      self.nodeGroup
        .selectAll<SVGGElement, SimulatedNode>('g.node')
        .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);

      self.labelGroup
        .selectAll<SVGTextElement, SimulatedNode>('text')
        .attr('x', (d) => d.x ?? 0)
        .attr('y', (d) => d.y ?? 0);
    });
  }

  public destroy(): void {
    this.simulation.stop();
  }
}
