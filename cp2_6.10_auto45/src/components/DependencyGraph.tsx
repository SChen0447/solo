import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Task, Dependency, ContextMenuState } from '../types';
import { TaskNode } from './TaskNode';
import { getTaskDuration } from '../data';

interface DependencyGraphProps {
  tasks: Task[];
  dependencies: Dependency[];
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
  onTaskDoubleClick: (task: Task) => void;
  onUpdateTaskProgress: (taskId: string, progress: number) => void;
  nodeWidth: number;
  nodeHeight: number;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  task: Task;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
  dependency: Dependency;
  isOnCriticalPath: boolean;
}

export const computeCriticalPath = (tasks: Task[]): { pathIds: Set<string>; linkIds: Set<string>; length: number } => {
  const taskMap = new Map<string, Task>();
  tasks.forEach(t => taskMap.set(t.id, t));

  const durationMap = new Map<string, number>();
  tasks.forEach(t => durationMap.set(t.id, getTaskDuration(t)));

  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  tasks.forEach(t => {
    inDegree.set(t.id, t.dependencies.length);
    t.dependencies.forEach(dep => {
      if (!successors.has(dep)) successors.set(dep, []);
      successors.get(dep)!.push(t.id);
    });
  });

  const queue: string[] = [];
  tasks.forEach(t => {
    if (t.dependencies.length === 0) queue.push(t.id);
  });

  const earliestStart = new Map<string, number>();
  const predecessors = new Map<string, string | null>();
  tasks.forEach(t => {
    earliestStart.set(t.id, 0);
    predecessors.set(t.id, null);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDuration = durationMap.get(current)!;
    const currentFinish = earliestStart.get(current)! + currentDuration;
    const nextTasks = successors.get(current) || [];

    nextTasks.forEach(next => {
      if (currentFinish > earliestStart.get(next)!) {
        earliestStart.set(next, currentFinish);
        predecessors.set(next, current);
      }
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    });
  }

  let maxFinish = 0;
  let endTask: string | null = null;
  tasks.forEach(t => {
    const finish = earliestStart.get(t)! + durationMap.get(t)!;
    if (finish > maxFinish && !(successors.get(t)?.length)) {
      maxFinish = finish;
      endTask = t.id;
    }
  });

  const pathIds = new Set<string>();
  const linkIds = new Set<string>();
  let current = endTask;
  while (current) {
    pathIds.add(current);
    const pred = predecessors.get(current);
    if (pred) {
      linkIds.add(`${pred}->${current}`);
    }
    current = pred;
  }

  return { pathIds, linkIds, length: maxFinish };
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  tasks,
  dependencies,
  onContextMenu,
  onTaskDoubleClick,
  onUpdateTaskProgress,
  nodeWidth,
  nodeHeight
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { pathIds: criticalPathIds, linkIds: criticalLinkIds } = computeCriticalPath(tasks);

  useEffect(() => {
    const savedPositions = localStorage.getItem('taskNodePositions');
    const positions = savedPositions ? JSON.parse(savedPositions) : {};

    const simNodes: SimNode[] = tasks.map(task => ({
      id: task.id,
      task,
      x: positions[task.id]?.x,
      y: positions[task.id]?.y,
      fx: positions[task.id]?.x ?? null,
      fy: positions[task.id]?.y ?? null
    }));

    const simLinks: SimLink[] = dependencies.map(dep => ({
      source: dep.source,
      target: dep.target,
      dependency: dep,
      isOnCriticalPath: criticalLinkIds.has(`${dep.source}->${dep.target}`)
    }));

    setNodes(simNodes);
    setLinks(simLinks);

    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(200)
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(Math.max(nodeWidth, nodeHeight) / 2 + 20))
      .alphaDecay(0.02)
      .on('tick', () => {
        setNodes([...simNodes]);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [tasks.length, dependencies.length, nodeWidth, nodeHeight]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    svg.call(zoom);
  }, []);

  const savePositions = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        positions[n.id] = { x: n.x, y: n.y };
      }
    });
    localStorage.setItem('taskNodePositions', JSON.stringify(positions));
  }, [nodes]);

  const handleDragStart = useCallback((taskId: string) => {
    setDraggingId(taskId);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
  }, []);

  const handleDragEnd = useCallback((taskId: string) => {
    setDraggingId(null);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    const node = nodes.find(n => n.id === taskId);
    if (node && node.x !== undefined && node.y !== undefined) {
      savePositions();
    }
  }, [nodes, savePositions]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.k - nodeWidth / 2;
    const y = (e.clientY - rect.top - transform.y) / transform.k - nodeHeight / 2;

    setNodes(prevNodes => {
      return prevNodes.map(n => {
        if (n.id === taskId) {
          return { ...n, x, y, fx: x, fy: y };
        }
        return n;
      });
    });

    savePositions();
  }, [transform, nodeWidth, nodeHeight, savePositions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getLinkPath = (link: SimLink): string => {
    const source = link.source as SimNode;
    const target = link.target as SimNode;
    if (!source || !target || source.x === undefined || target.x === undefined) return '';

    const sx = source.x + nodeWidth / 2;
    const sy = source.y + nodeHeight / 2;
    const tx = target.x + nodeWidth / 2;
    const ty = target.y + nodeHeight / 2;

    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return '';

    const offsetX = (dx / dist) * 15;
    const offsetY = (dy / dist) * 15;

    return `M ${sx} ${sy} L ${tx - offsetX} ${ty - offsetY}`;
  };

  return (
    <div
      ref={containerRef}
      className="graph-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        className="graph-svg"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#8892a6" />
          </marker>
          <marker
            id="arrowhead-hover"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3498db" />
          </marker>
          <marker
            id="arrowhead-critical"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e67e22" />
          </marker>
        </defs>
        <g className="links">
          {links.map((link, i) => {
            const linkId = `${(link.source as SimNode)?.id || link.source}->${(link.target as SimNode)?.id || link.target}`;
            const isHovered = hoveredLink === linkId;
            const isCritical = link.isOnCriticalPath;
            const markerEnd = isCritical
              ? 'url(#arrowhead-critical)'
              : isHovered
                ? 'url(#arrowhead-hover)'
                : 'url(#arrowhead)';

            return (
              <g key={linkId}>
                <path
                  d={getLinkPath(link)}
                  className={`link ${isCritical ? 'link-critical' : ''} ${isHovered ? 'link-hover' : ''}`}
                  stroke={isCritical ? '#e67e22' : isHovered ? '#3498db' : '#8892a6'}
                  strokeWidth={isCritical ? 3 : 2}
                  fill="none"
                  markerEnd={markerEnd}
                  style={{ transition: 'all 0.2s ease' }}
                  onMouseEnter={() => setHoveredLink(linkId)}
                  onMouseLeave={() => setHoveredLink(null)}
                />
                {isHovered && link.dependency && (
                  <text
                    x={(((link.source as SimNode).x! + (link.target as SimNode).x!) / 2) + nodeWidth / 2}
                    y={(((link.source as SimNode).y! + (link.target as SimNode).y!) / 2) + nodeHeight / 2}
                    className="link-tooltip"
                    textAnchor="middle"
                    dy="-10"
                  >
                    {link.dependency.description || ''}
                    {link.dependency.delayDays ? ` (延迟${link.dependency.delayDays}天)` : ''}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div
        className="nodes-container"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`
        }}
      >
        {nodes.map(node => (
          <div
            key={node.id}
            ref={el => { if (el) nodesRef.current.set(node.id, el); }}
            className="node-wrapper"
            style={{
              position: 'absolute',
              left: node.x ?? 0,
              top: node.y ?? 0,
              width: nodeWidth,
              height: nodeHeight,
              pointerEvents: draggingId === node.id ? 'none' : 'auto'
            }}
          >
            <TaskNode
              task={node.task}
              isOnCriticalPath={criticalPathIds.has(node.id)}
              onContextMenu={onContextMenu}
              onDoubleClick={onTaskDoubleClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              nodeWidth={nodeWidth}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
