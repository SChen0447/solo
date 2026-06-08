import { useState } from 'react';
import type { GraphNode, GraphEdge, TopologyResult, ViewMode } from './types';

interface TimelineViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  topology: TopologyResult | null;
  viewMode: ViewMode;
}

function TimelineView({ nodes, edges, topology, viewMode }: TimelineViewProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const getNodeById = (id: string): GraphNode | undefined => nodes.find((n) => n.id === id);

  const getDependencyChain = (nodeId: string): { prereqs: GraphNode[]; dependents: GraphNode[] } => {
    const prereqs: GraphNode[] = [];
    const dependents: GraphNode[] = [];

    edges.forEach((edge) => {
      if (edge.target === nodeId) {
        const source = getNodeById(edge.source);
        if (source) prereqs.push(source);
      }
      if (edge.source === nodeId) {
        const target = getNodeById(edge.target);
        if (target) dependents.push(target);
      }
    });

    return { prereqs, dependents };
  };

  const selectedNodeData = selectedNode ? getNodeById(selectedNode) : null;
  const dependencyChain = selectedNode ? getDependencyChain(selectedNode) : null;

  const categoryLabels: Record<string, string> = {
    math: '数学',
    programming: '编程',
    design: '设计',
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>学习路径</h3>
        {topology?.hasCycle && (
          <div style={styles.cycleWarning}>
            ⚠️ 检测到循环依赖
          </div>
        )}
      </div>

      {!topology ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>点击「计算路径」按钮</p>
          <p style={styles.emptySubtext}>生成推荐学习顺序</p>
        </div>
      ) : (
        <div style={styles.timeline}>
          {topology.layers.map((layer, layerIndex) => (
            <div key={layerIndex} style={styles.layer}>
              <div style={styles.layerLabel}>
                第 {layerIndex + 1} 阶段
              </div>

              <div style={styles.layerNodes}>
                {layer.map((nodeId) => {
                  const node = getNodeById(nodeId);
                  if (!node) return null;
                  const isCycle = topology.cycleNodes.includes(nodeId);
                  const isSelected = selectedNode === nodeId;

                  return (
                    <div
                      key={nodeId}
                      onClick={() => viewMode === 'preview' && setSelectedNode(nodeId)}
                      style={{
                        ...styles.nodeCard,
                        backgroundColor: node.color + '30',
                        borderColor: isCycle ? '#ff4444' : node.color,
                        boxShadow: isSelected ? `0 0 15px ${node.color}` : 'none',
                        cursor: viewMode === 'preview' ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ ...styles.nodeDot, backgroundColor: node.color }} />
                      <span style={styles.nodeTitle}>{node.title}</span>
                      {isCycle && <span style={styles.cycleBadge}>环</span>}
                    </div>
                  );
                })}
              </div>

              {layerIndex < topology.layers.length - 1 && (
                <div style={styles.arrowContainer}>
                  <div style={styles.arrowLine} />
                  <div style={styles.arrowHead} />
                </div>
              )}
            </div>
          ))}

          {topology.cycleNodes.length > 0 && topology.layers.length === 0 && (
            <div style={styles.cycleSection}>
              <div style={styles.cycleTitle}>存在循环依赖的节点：</div>
              {topology.cycleNodes.map((nodeId) => {
                const node = getNodeById(nodeId);
                if (!node) return null;
                return (
                  <div
                    key={nodeId}
                    style={{
                      ...styles.cycleNode,
                      backgroundColor: node.color + '20',
                      borderColor: '#ff4444',
                    }}
                  >
                    <span style={{ ...styles.cycleNodeDot, backgroundColor: node.color }} />
                    <span style={styles.nodeTitle}>{node.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedNodeData && dependencyChain && viewMode === 'preview' && (
        <div style={styles.detailCard}>
          <div style={styles.detailHeader}>
            <div
              style={{
                ...styles.detailDot,
                backgroundColor: selectedNodeData.color,
              }}
            />
            <h4 style={styles.detailTitle}>{selectedNodeData.title}</h4>
            <button
              onClick={() => setSelectedNode(null)}
              style={styles.closeBtn}
            >
              ×
            </button>
          </div>

          <div style={styles.detailSection}>
            <div style={styles.detailLabel}>分类</div>
            <div style={styles.detailValue}>
              {categoryLabels[selectedNodeData.category] || selectedNodeData.category}
            </div>
          </div>

          {dependencyChain.prereqs.length > 0 && (
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>先修知识 ({dependencyChain.prereqs.length})</div>
              <div style={styles.dependencyList}>
                {dependencyChain.prereqs.map((prereq) => (
                  <div
                    key={prereq.id}
                    style={{
                      ...styles.dependencyItem,
                      borderLeftColor: prereq.color,
                    }}
                  >
                    {prereq.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {dependencyChain.dependents.length > 0 && (
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>后续课程 ({dependencyChain.dependents.length})</div>
              <div style={styles.dependencyList}>
                {dependencyChain.dependents.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      ...styles.dependencyItem,
                      borderLeftColor: dep.color,
                    }}
                  >
                    {dep.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {dependencyChain.prereqs.length === 0 &&
            dependencyChain.dependents.length === 0 && (
              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>依赖关系</div>
                <div style={styles.detailValueMuted}>暂无依赖关系</div>
              </div>
            )}
        </div>
      )}

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#4a90d9' }} />
          <span>数学</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#4ab97a' }} />
          <span>编程</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#e8a849' }} />
          <span>设计</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    background: 'rgba(26, 26, 46, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  cycleWarning: {
    padding: '8px 12px',
    background: 'rgba(255, 68, 68, 0.2)',
    border: '1px solid rgba(255, 68, 68, 0.4)',
    borderRadius: '8px',
    color: '#ff6b6b',
    fontSize: '13px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  emptyText: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptySubtext: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  timeline: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '8px',
  },
  layer: {
    marginBottom: '8px',
  },
  layerLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '8px',
    fontWeight: '500',
  },
  layerNodes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  nodeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
    transition: 'all 0.2s ease',
  },
  nodeDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  nodeTitle: {
    flex: 1,
    fontSize: '14px',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cycleBadge: {
    padding: '2px 6px',
    background: 'rgba(255, 68, 68, 0.3)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#ff6b6b',
  },
  arrowContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0',
  },
  arrowLine: {
    width: '2px',
    height: '24px',
    background: 'linear-gradient(to bottom, rgba(233, 69, 96, 0.8), rgba(233, 69, 96, 0.3))',
    boxShadow: '0 0 8px rgba(233, 69, 96, 0.4)',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '8px solid rgba(233, 69, 96, 0.8)',
    filter: 'drop-shadow(0 0 4px rgba(233, 69, 96, 0.6))',
  },
  cycleSection: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(255, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 68, 68, 0.3)',
  },
  cycleTitle: {
    fontSize: '13px',
    color: '#ff6b6b',
    marginBottom: '10px',
  },
  cycleNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    marginBottom: '6px',
  },
  cycleNodeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  detailCard: {
    position: 'absolute',
    top: '60px',
    left: '16px',
    right: '16px',
    background: 'rgba(26, 26, 46, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '16px',
    zIndex: 100,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    position: 'relative',
  },
  detailDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
  },
  detailTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSection: {
    marginBottom: '12px',
  },
  detailLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '6px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#fff',
  },
  detailValueMuted: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  dependencyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  dependencyItem: {
    padding: '6px 10px',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.8)',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    borderLeft: '3px solid',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
};

export default TimelineView;
