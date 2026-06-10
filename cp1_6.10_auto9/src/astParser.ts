export type NodeType = 'start' | 'end' | 'process' | 'condition' | 'function' | 'loop';

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  code: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  order: number;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const VERTICAL_SPACING = 90;
const HORIZONTAL_SPACING = 220;

let nodeCounter = 0;
let edgeCounter = 0;
let orderCounter = 0;

function createNode(type: NodeType, label: string, code: string, x: number, y: number): FlowNode {
  nodeCounter++;
  const width = type === 'condition' ? 160 : NODE_WIDTH;
  const height = type === 'condition' ? 80 : NODE_HEIGHT;
  return {
    id: `node_${nodeCounter}`,
    type,
    label,
    code,
    x,
    y,
    width,
    height
  };
}

function createEdge(source: string, target: string, label?: string): FlowEdge {
  edgeCounter++;
  orderCounter++;
  return {
    id: `edge_${edgeCounter}`,
    source,
    target,
    label,
    order: orderCounter
  };
}

function escapeLabel(code: string): string {
  let label = code.trim().replace(/\s+/g, ' ');
  if (label.length > 30) {
    label = label.slice(0, 27) + '...';
  }
  return label;
}

interface ParseState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  indentLevel: number;
}

function parseBlock(lines: string[], startIdx: number, state: ParseState, baseX: number, baseY: number): { lastNodeId: string | null; endIdx: number } {
  let currentY = baseY;
  let lastNodeId: string | null = null;
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    if (indent < state.indentLevel && startIdx !== i) {
      break;
    }

    if (trimmed.startsWith('function ') || trimmed.startsWith('const ') && trimmed.includes('=>') || trimmed.startsWith('let ') && trimmed.includes('=>')) {
      const funcMatch = trimmed.match(/(?:function\s+)?(\w+)\s*[=(]/) || trimmed.match(/(\w+)\s*=\s*(?:async\s+)?\(/);
      const funcName = funcMatch ? funcMatch[1] : 'anonymous';
      const funcNode = createNode('function', `函数: ${funcName}`, trimmed, baseX, currentY);
      state.nodes.push(funcNode);

      if (lastNodeId) {
        state.edges.push(createEdge(lastNodeId, funcNode.id));
      }
      lastNodeId = funcNode.id;
      currentY += VERTICAL_SPACING;

      const openBraceIdx = trimmed.indexOf('{');
      if (openBraceIdx !== -1 || lines[i].includes('{')) {
        state.indentLevel += 2;
        const blockResult = parseBlock(lines, i + 1, state, baseX, currentY);
        state.indentLevel -= 2;

        if (blockResult.lastNodeId) {
          lastNodeId = blockResult.lastNodeId;
        }
        i = blockResult.endIdx;
        currentY = state.nodes.length > 0 ? Math.max(...state.nodes.filter(n => n.id !== funcNode.id).map(n => n.y)) + VERTICAL_SPACING : currentY;
      }
      i++;
      continue;
    }

    if (trimmed.startsWith('if ') || trimmed.startsWith('if(')) {
      const conditionMatch = trimmed.match(/if\s*\((.+?)\)/);
      const condition = conditionMatch ? conditionMatch[1].trim() : 'condition';
      const condNode = createNode('condition', escapeLabel(condition), trimmed, baseX, currentY);
      state.nodes.push(condNode);

      if (lastNodeId) {
        state.edges.push(createEdge(lastNodeId, condNode.id));
      }
      lastNodeId = condNode.id;
      currentY += VERTICAL_SPACING;

      const hasBrace = trimmed.includes('{') || lines[i].includes('{');
      let trueEndNodeId: string | null = null;
      let falseStartX = baseX + HORIZONTAL_SPACING;
      let nextIdx = i + 1;

      if (hasBrace) {
        state.indentLevel += 2;
        const trueResult = parseBlock(lines, i + 1, state, baseX, currentY);
        state.indentLevel -= 2;
        trueEndNodeId = trueResult.lastNodeId;
        nextIdx = trueResult.endIdx;
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.startsWith('else')) {
          const stmtNode = createNode('process', escapeLabel(nextLine), nextLine, baseX, currentY);
          state.nodes.push(stmtNode);
          trueEndNodeId = stmtNode.id;
          currentY += VERTICAL_SPACING;
          nextIdx = i + 2;
        }
      }

      if (trueEndNodeId) {
        state.edges.push(createEdge(condNode.id, state.nodes.find(n => n.y === currentY - VERTICAL_SPACING && n.x === baseX && n.id !== condNode.id)?.id || trueEndNodeId, 'true'));
      }

      let hasElse = false;
      let falseEndNodeId: string | null = null;
      let elseIdx = nextIdx;

      while (elseIdx < lines.length) {
        const elseLine = lines[elseIdx].trim();
        if (!elseLine || elseLine.startsWith('//')) {
          elseIdx++;
          continue;
        }
        if (elseLine.startsWith('else') || elseLine.startsWith('} else')) {
          hasElse = true;
          const elseMatch = elseLine.match(/else\s+if\s*\((.+?)\)/);
          if (elseMatch) {
            const elifNode = createNode('condition', escapeLabel(elseMatch[1].trim()), elseLine, falseStartX, currentY);
            state.nodes.push(elifNode);
            state.edges.push(createEdge(condNode.id, elifNode.id, 'false'));

            state.indentLevel += 2;
            const elifResult = parseBlock(lines, elseIdx + 1, state, falseStartX, currentY + VERTICAL_SPACING);
            state.indentLevel -= 2;
            falseEndNodeId = elifResult.lastNodeId;
            nextIdx = elifResult.endIdx;
          } else {
            state.indentLevel += 2;
            const falseResult = parseBlock(lines, elseIdx + 1, state, falseStartX, currentY);
            state.indentLevel -= 2;
            falseEndNodeId = falseResult.lastNodeId;
            if (falseResult.lastNodeId) {
              state.edges.push(createEdge(condNode.id, falseResult.lastNodeId, 'false'));
            }
            nextIdx = falseResult.endIdx;
          }
          break;
        }
        break;
      }

      if (!hasElse) {
        i = nextIdx;
        continue;
      }

      const maxTrueY = trueEndNodeId ? (state.nodes.find(n => n.id === trueEndNodeId)?.y || currentY) : currentY;
      const maxFalseY = falseEndNodeId ? (state.nodes.find(n => n.id === falseEndNodeId)?.y || currentY) : currentY;
      currentY = Math.max(maxTrueY, maxFalseY) + VERTICAL_SPACING;

      const mergeNode = createNode('process', '继续', '// continue', baseX + HORIZONTAL_SPACING / 2, currentY - VERTICAL_SPACING);
      state.nodes.push(mergeNode);

      if (trueEndNodeId) {
        state.edges.push(createEdge(trueEndNodeId, mergeNode.id));
      }
      if (falseEndNodeId) {
        state.edges.push(createEdge(falseEndNodeId, mergeNode.id));
      }

      lastNodeId = mergeNode.id;
      i = nextIdx;
      continue;
    }

    if (trimmed.startsWith('for ') || trimmed.startsWith('for(') || trimmed.startsWith('while ') || trimmed.startsWith('while(')) {
      const loopMatch = trimmed.match(/(for|while)\s*\((.+?)\)/);
      const loopType = loopMatch ? loopMatch[1] : 'loop';
      const loopCond = loopMatch ? loopMatch[2].trim() : '';
      const loopLabel = loopType === 'for' ? `for: ${escapeLabel(loopCond)}` : `while: ${escapeLabel(loopCond)}`;
      const loopNode = createNode('loop', loopLabel, trimmed, baseX, currentY);
      state.nodes.push(loopNode);

      if (lastNodeId) {
        state.edges.push(createEdge(lastNodeId, loopNode.id));
      }
      lastNodeId = loopNode.id;
      currentY += VERTICAL_SPACING;

      const hasBrace = trimmed.includes('{') || lines[i].includes('{');
      if (hasBrace) {
        state.indentLevel += 2;
        const bodyResult = parseBlock(lines, i + 1, state, baseX, currentY);
        state.indentLevel -= 2;

        if (bodyResult.lastNodeId) {
          state.edges.push(createEdge(bodyResult.lastNodeId, loopNode.id, '循环'));
          lastNodeId = loopNode.id;
        }
        i = bodyResult.endIdx;
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine) {
          const stmtNode = createNode('process', escapeLabel(nextLine), nextLine, baseX, currentY);
          state.nodes.push(stmtNode);
          state.edges.push(createEdge(loopNode.id, stmtNode.id, 'true'));
          state.edges.push(createEdge(stmtNode.id, loopNode.id, '循环'));
          currentY += VERTICAL_SPACING;
          i = i + 2;
          continue;
        }
      }

      const afterLoopNode = createNode('process', '循环结束', '// loop end', baseX, currentY);
      state.nodes.push(afterLoopNode);
      state.edges.push(createEdge(loopNode.id, afterLoopNode.id, 'false'));
      lastNodeId = afterLoopNode.id;
      currentY += VERTICAL_SPACING;
      i++;
      continue;
    }

    if (trimmed.startsWith('return ')) {
      const returnNode = createNode('process', escapeLabel(trimmed), trimmed, baseX, currentY);
      state.nodes.push(returnNode);
      if (lastNodeId) {
        state.edges.push(createEdge(lastNodeId, returnNode.id));
      }
      lastNodeId = returnNode.id;
      currentY += VERTICAL_SPACING;
      i++;
      continue;
    }

    if (trimmed === '{' || trimmed === '}' || trimmed.startsWith('}')) {
      if (trimmed.startsWith('}') && indent <= state.indentLevel && startIdx !== i) {
        return { lastNodeId, endIdx: i };
      }
      i++;
      continue;
    }

    const stmtNode = createNode('process', escapeLabel(trimmed), trimmed, baseX, currentY);
    state.nodes.push(stmtNode);
    if (lastNodeId) {
      state.edges.push(createEdge(lastNodeId, stmtNode.id));
    }
    lastNodeId = stmtNode.id;
    currentY += VERTICAL_SPACING;
    i++;
  }

  return { lastNodeId, endIdx: i };
}

export function parseCodeToFlow(code: string): FlowData {
  nodeCounter = 0;
  edgeCounter = 0;
  orderCounter = 0;

  const state: ParseState = {
    nodes: [],
    edges: [],
    indentLevel: 0
  };

  const lines = code.split('\n');

  const startNode = createNode('start', '开始', '// start', 0, 0);
  state.nodes.push(startNode);

  const baseX = 60;
  const baseY = 120;

  const result = parseBlock(lines, 0, state, baseX, baseY);

  if (result.lastNodeId) {
    const lastY = Math.max(...state.nodes.map(n => n.y));
    const endNode = createNode('end', '结束', '// end', baseX, lastY + VERTICAL_SPACING);
    state.nodes.push(endNode);
    state.edges.push(createEdge(result.lastNodeId, endNode.id));
  }

  return {
    nodes: state.nodes,
    edges: state.edges
  };
}

export function updateNodeCode(nodeId: string, newCode: string, flowData: FlowData): FlowData {
  const nodes = flowData.nodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        code: newCode,
        label: escapeLabel(newCode)
      };
    }
    return node;
  });
  return { ...flowData, nodes };
}
