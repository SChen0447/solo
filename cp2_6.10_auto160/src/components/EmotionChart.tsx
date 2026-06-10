import React from 'react';
import type { DialogueNode, EmotionDataPoint } from '../types';

interface EmotionChartProps {
  nodes: Record<string, DialogueNode>;
  rootId: string;
  selectedId: string | null;
}

const CHART_HEIGHT = 120;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 20;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 16;
const Y_MIN = -10;
const Y_MAX = 10;

const computeEmotionPaths = (
  nodes: Record<string, DialogueNode>,
  rootId: string,
): EmotionDataPoint[][] => {
  const paths: EmotionDataPoint[][] = [];

  const dfs = (
    nodeId: string,
    depth: number,
    cumAnger: number,
    cumSadness: number,
    cumJoy: number,
    currentPath: EmotionDataPoint[],
  ) => {
    const node = nodes[nodeId];
    if (!node) return;

    const newAnger = cumAnger + node.angerDelta;
    const newSadness = cumSadness + node.sadnessDelta;
    const newJoy = cumJoy + node.joyDelta;

    const point: EmotionDataPoint = {
      depth,
      nodeId,
      anger: newAnger,
      sadness: newSadness,
      joy: newJoy,
    };

    const newPath = [...currentPath, point];

    if (node.childIds.length === 0) {
      paths.push(newPath);
      return;
    }

    for (const childId of node.childIds) {
      dfs(childId, depth + 1, newAnger, newSadness, newJoy, newPath);
    }
  };

  dfs(rootId, 0, 0, 0, 0, []);
  return paths;
};

const getMaxDepth = (nodes: Record<string, DialogueNode>, rootId: string): number => {
  let maxDepth = 0;
  const dfs = (nodeId: string, depth: number) => {
    const node = nodes[nodeId];
    if (!node) return;
    maxDepth = Math.max(maxDepth, depth);
    for (const childId of node.childIds) {
      dfs(childId, depth + 1);
    }
  };
  dfs(rootId, 0);
  return maxDepth;
};

const EmotionChart: React.FC<EmotionChartProps> = ({ nodes, rootId, selectedId }) => {
  const paths = computeEmotionPaths(nodes, rootId);
  const maxDepth = getMaxDepth(nodes, rootId);
  const chartWidth = Math.max(600, maxDepth * 120 + PADDING_LEFT + PADDING_RIGHT);
  const innerWidth = chartWidth - PADDING_LEFT - PADDING_RIGHT;
  const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const getX = (depth: number) => {
    if (maxDepth === 0) return PADDING_LEFT + innerWidth / 2;
    return PADDING_LEFT + (depth / maxDepth) * innerWidth;
  };

  const getY = (value: number) => {
    const clamped = Math.max(Y_MIN, Math.min(Y_MAX, value));
    const ratio = (clamped - Y_MIN) / (Y_MAX - Y_MIN);
    return PADDING_TOP + innerHeight - ratio * innerHeight;
  };

  const renderGridLines = () => {
    const lines = [];
    for (let v = Y_MIN; v <= Y_MAX; v += 5) {
      lines.push(
        <line
          key={`y-${v}`}
          x1={PADDING_LEFT}
          y1={getY(v)}
          x2={chartWidth - PADDING_RIGHT}
          y2={getY(v)}
          stroke="#2d2d44"
          strokeWidth={1}
        />,
      );
    }
    return lines;
  };

  const renderYLabels = () => {
    const labels = [];
    for (let v = Y_MIN; v <= Y_MAX; v += 5) {
      labels.push(
        <text
          key={`yl-${v}`}
          x={PADDING_LEFT - 8}
          y={getY(v)}
          fill="#565f89"
          fontSize={10}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {v > 0 ? `+${v}` : v}
        </text>,
      );
    }
    return labels;
  };

  const renderXLabels = () => {
    const labels = [];
    for (let d = 0; d <= maxDepth; d++) {
      labels.push(
        <text
          key={`xl-${d}`}
          x={getX(d)}
          y={CHART_HEIGHT - 6}
          fill="#565f89"
          fontSize={10}
          textAnchor="middle"
        >
          L{d}
        </text>,
      );
    }
    return labels;
  };

  const colors = {
    anger: '#ef4444',
    sadness: '#3b82f6',
    joy: '#10b981',
  };

  const renderPath = (
    data: EmotionDataPoint[],
    color: string,
    key: string,
    valueKey: 'anger' | 'sadness' | 'joy',
  ) => {
    if (data.length < 2) return null;
    let d = `M ${getX(data[0].depth)} ${getY(data[0][valueKey])}`;
    for (let i = 1; i < data.length; i++) {
      d += ` L ${getX(data[i].depth)} ${getY(data[i][valueKey])}`;
    }
    return (
      <path
        key={key}
        d={d}
        stroke={color}
        strokeWidth={2}
        fill="none"
        opacity={0.85}
      />
    );
  };

  const renderDataPoints = (
    data: EmotionDataPoint[],
    color: string,
    keyPrefix: string,
    valueKey: 'anger' | 'sadness' | 'joy',
  ) => {
    return data.map((pt, i) => {
      const isSelected = selectedId === pt.nodeId;
      return (
        <g key={`${keyPrefix}-${i}`}>
          {isSelected && (
            <circle
              cx={getX(pt.depth)}
              cy={getY(pt[valueKey])}
              r={10}
              fill="none"
              stroke="white"
              strokeWidth={1.5}
            />
          )}
          <circle
            cx={getX(pt.depth)}
            cy={getY(pt[valueKey])}
            r={isSelected ? 7 : 6}
            fill={color}
          />
        </g>
      );
    });
  };

  return (
    <div
      style={{
        height: CHART_HEIGHT,
        background: '#1e1e2e',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: 11, color: '#565f89', marginRight: 4 }}>情绪趋势</span>
        {[
          { label: '愤怒', color: colors.anger },
          { label: '悲伤', color: colors.sadness },
          { label: '喜悦', color: colors.joy },
        ].map((item) => (
          <span
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: '#a9b1d6',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: item.color,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <svg
          width={chartWidth}
          height={CHART_HEIGHT}
          style={{ display: 'block' }}
        >
          {renderGridLines()}
          {renderYLabels()}
          {renderXLabels()}
          {paths.map((path, pathIdx) => (
            <React.Fragment key={`path-${pathIdx}`}>
              {renderPath(path, colors.anger, `anger-${pathIdx}`, 'anger')}
              {renderPath(path, colors.sadness, `sadness-${pathIdx}`, 'sadness')}
              {renderPath(path, colors.joy, `joy-${pathIdx}`, 'joy')}
            </React.Fragment>
          ))}
          {paths.map((path, pathIdx) => (
            <React.Fragment key={`pts-${pathIdx}`}>
              {renderDataPoints(path, colors.anger, `anger-pt-${pathIdx}`, 'anger')}
              {renderDataPoints(path, colors.sadness, `sadness-pt-${pathIdx}`, 'sadness')}
              {renderDataPoints(path, colors.joy, `joy-pt-${pathIdx}`, 'joy')}
            </React.Fragment>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default EmotionChart;
