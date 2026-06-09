export type NodeType =
  | 'literal'
  | 'quantifier'
  | 'group'
  | 'anchor'
  | 'charset'
  | 'alternation'
  | 'escape'
  | 'dot'
  | 'root';

export interface ParseNode {
  id: string;
  type: NodeType;
  value: string;
  label: string;
  description: string;
  children: ParseNode[];
  position: {
    start: number;
    end: number;
  };
  params?: {
    min?: number;
    max?: number;
    greedy?: boolean;
    charset?: string;
    negated?: boolean;
    groupIndex?: number;
    groupName?: string;
  };
}

let nodeIdCounter = 0;

function createNode(
  type: NodeType,
  value: string,
  label: string,
  description: string,
  start: number,
  end: number,
  params?: ParseNode['params']
): ParseNode {
  return {
    id: `node_${nodeIdCounter++}`,
    type,
    value,
    label,
    description,
    children: [],
    position: { start, end },
    params
  };
}

function resetCounter() {
  nodeIdCounter = 0;
}

const QUANTIFIERS: Record<string, { label: string; desc: string; min: number; max: number }> = {
  '*': { label: '*', desc: '表示零次或多次匹配', min: 0, max: Infinity },
  '+': { label: '+', desc: '表示一次或多次匹配', min: 1, max: Infinity },
  '?': { label: '?', desc: '表示零次或一次匹配', min: 0, max: 1 }
};

const ANCHORS: Record<string, { label: string; desc: string }> = {
  '^': { label: '^', desc: '匹配字符串或行的开头' },
  '$': { label: '$', desc: '匹配字符串或行的结尾' },
  '\\b': { label: '\\b', desc: '匹配单词边界' },
  '\\B': { label: '\\B', desc: '匹配非单词边界' },
  '\\A': { label: '\\A', desc: '匹配字符串开头' },
  '\\Z': { label: '\\Z', desc: '匹配字符串结尾' }
};

const ESCAPES: Record<string, { label: string; desc: string }> = {
  '\\d': { label: '\\d', desc: '匹配任意数字 [0-9]' },
  '\\D': { label: '\\D', desc: '匹配任意非数字 [^0-9]' },
  '\\w': { label: '\\w', desc: '匹配单词字符 [a-zA-Z0-9_]' },
  '\\W': { label: '\\W', desc: '匹配非单词字符 [^a-zA-Z0-9_]' },
  '\\s': { label: '\\s', desc: '匹配空白字符' },
  '\\S': { label: '\\S', desc: '匹配非空白字符' },
  '\\n': { label: '\\n', desc: '匹配换行符' },
  '\\t': { label: '\\t', desc: '匹配制表符' },
  '\\r': { label: '\\r', desc: '匹配回车符' },
  '\\.': { label: '\\.', desc: '匹配字面点号' },
  '\\\\': { label: '\\\\', desc: '匹配字面反斜杠' },
  '\\+': { label: '\\+', desc: '匹配字面加号' },
  '\\*': { label: '\\*', desc: '匹配字面星号' },
  '\\?': { label: '\\?', desc: '匹配字面问号' },
  '\\^': { label: '\\^', desc: '匹配字面脱字符' },
  '\\$': { label: '\\$', desc: '匹配字面美元符' },
  '\\|': { label: '\\|', desc: '匹配字面管道符' },
  '\\(': { label: '\\(', desc: '匹配字面左括号' },
  '\\)': { label: '\\)', desc: '匹配字面右括号' },
  '\\[': { label: '\\[', desc: '匹配字面左方括号' },
  '\\]': { label: '\\]', desc: '匹配字面右方括号' },
  '\\{': { label: '\\{', desc: '匹配字面左花括号' },
  '\\}': { label: '\\}', desc: '匹配字面右花括号' }
};

interface ParserState {
  source: string;
  pos: number;
  groupIndex: number;
}

function parseAlternation(state: ParserState): ParseNode[] {
  const branches: ParseNode[][] = [parseSequence(state)];
  
  while (state.pos < state.source.length && state.source[state.pos] === '|') {
    state.pos++;
    branches.push(parseSequence(state));
  }
  
  if (branches.length === 1) {
    return branches[0];
  }
  
  const altNode = createNode(
    'alternation',
    '|',
    '|',
    '表示或关系，匹配左侧或右侧的表达式',
    0, 0
  );
  altNode.children = branches.flat();
  return [altNode];
}

function parseSequence(state: ParserState): ParseNode[] {
  const nodes: ParseNode[] = [];
  
  while (state.pos < state.source.length) {
    const ch = state.source[state.pos];
    
    if (ch === ')' || ch === ']' || ch === '|') {
      break;
    }
    
    const node = parseAtom(state);
    if (node) {
      const quantNode = parseQuantifier(state, node);
      nodes.push(quantNode);
    }
  }
  
  return nodes;
}

function parseAtom(state: ParserState): ParseNode | null {
  const ch = state.source[state.pos];
  const start = state.pos;
  
  if (ch === '(') {
    return parseGroup(state);
  }
  
  if (ch === '[') {
    return parseCharset(state);
  }
  
  if (ch === '\\') {
    return parseEscape(state);
  }
  
  if (ch === '.') {
    state.pos++;
    return createNode('dot', '.', '.', '匹配除换行符外的任意单个字符', start, state.pos);
  }
  
  if (ANCHORS[ch]) {
    state.pos++;
    return createNode('anchor', ch, ANCHORS[ch].label, ANCHORS[ch].desc, start, state.pos);
  }
  
  if (ch !== '*' && ch !== '+' && ch !== '?' && ch !== '{' && ch !== '}' && ch !== '|' && ch !== ')' && ch !== ']') {
    state.pos++;
    return createNode('literal', ch, ch, `匹配字面字符: ${ch}`, start, state.pos);
  }
  
  state.pos++;
  return null;
}

function parseGroup(state: ParserState): ParseNode {
  const start = state.pos;
  state.pos++;
  
  let groupName: string | undefined;
  let isNonCapturing = false;
  let lookaround: string | undefined;
  
  if (state.source.startsWith('?:', state.pos)) {
    state.pos += 2;
    isNonCapturing = true;
  } else if (state.source.startsWith('?=', state.pos)) {
    state.pos += 2;
    lookaround = 'positive-lookahead';
  } else if (state.source.startsWith('?!', state.pos)) {
    state.pos += 2;
    lookaround = 'negative-lookahead';
  } else if (state.source.startsWith('?<=', state.pos)) {
    state.pos += 3;
    lookaround = 'positive-lookbehind';
  } else if (state.source.startsWith('?<!', state.pos)) {
    state.pos += 3;
    lookaround = 'negative-lookbehind';
  } else if (state.source.startsWith('?<', state.pos)) {
    state.pos += 2;
    let nameEnd = state.pos;
    while (nameEnd < state.source.length && state.source[nameEnd] !== '>') {
      nameEnd++;
    }
    groupName = state.source.slice(state.pos, nameEnd);
    state.pos = nameEnd + 1;
  }
  
  const groupIndex = isNonCapturing || lookaround ? -1 : state.groupIndex++;
  const children = parseAlternation(state);
  
  if (state.pos < state.source.length && state.source[state.pos] === ')') {
    state.pos++;
  }
  
  let desc = `捕获分组 #${groupIndex}`;
  let label = `(...)`;
  
  if (isNonCapturing) {
    desc = '非捕获分组';
    label = '(?:...)';
  } else if (lookaround === 'positive-lookahead') {
    desc = '正向前瞻断言';
    label = '(?=...)';
  } else if (lookaround === 'negative-lookahead') {
    desc = '负向前瞻断言';
    label = '(?!...)';
  } else if (lookaround === 'positive-lookbehind') {
    desc = '正向后顾断言';
    label = '(?<=...)';
  } else if (lookaround === 'negative-lookbehind') {
    desc = '负向后顾断言';
    label = '(?<!...)';
  } else if (groupName) {
    desc = `命名捕获分组: ${groupName}`;
    label = `(?<${groupName}>...)`;
  }
  
  const node = createNode('group', state.source.slice(start, state.pos), label, desc, start, state.pos, {
    groupIndex,
    groupName
  });
  node.children = children;
  return node;
}

function parseCharset(state: ParserState): ParseNode {
  const start = state.pos;
  state.pos++;
  
  let negated = false;
  if (state.source[state.pos] === '^') {
    negated = true;
    state.pos++;
  }
  
  let charsetContent = '';
  while (state.pos < state.source.length && state.source[state.pos] !== ']') {
    if (state.source[state.pos] === '\\' && state.pos + 1 < state.source.length) {
      charsetContent += state.source.slice(state.pos, state.pos + 2);
      state.pos += 2;
    } else {
      charsetContent += state.source[state.pos];
      state.pos++;
    }
  }
  
  if (state.pos < state.source.length && state.source[state.pos] === ']') {
    state.pos++;
  }
  
  const desc = negated
    ? `排除型字符组: 匹配不在 [${charsetContent}] 中的字符`
    : `字符组: 匹配 [${charsetContent}] 中的任意字符`;
  const label = negated ? `[^${charsetContent}]` : `[${charsetContent}]`;
  
  return createNode('charset', state.source.slice(start, state.pos), label, desc, start, state.pos, {
    charset: charsetContent,
    negated
  });
}

function parseEscape(state: ParserState): ParseNode {
  const start = state.pos;
  
  if (state.pos + 1 < state.source.length) {
    const twoChar = state.source.slice(state.pos, state.pos + 2);
    
    if (ANCHORS[twoChar]) {
      state.pos += 2;
      return createNode('anchor', twoChar, ANCHORS[twoChar].label, ANCHORS[twoChar].desc, start, state.pos);
    }
    
    if (ESCAPES[twoChar]) {
      state.pos += 2;
      return createNode('escape', twoChar, ESCAPES[twoChar].label, ESCAPES[twoChar].desc, start, state.pos);
    }
    
    if (/\\[0-9]/.test(twoChar)) {
      state.pos += 2;
      return createNode('escape', twoChar, twoChar, `反向引用分组 #${twoChar[1]}`, start, state.pos);
    }
    
    state.pos += 2;
    return createNode('escape', twoChar, twoChar, `转义字符: ${twoChar}`, start, state.pos);
  }
  
  state.pos++;
  return createNode('literal', '\\', '\\', '反斜杠', start, state.pos);
}

function parseQuantifier(state: ParserState, node: ParseNode): ParseNode {
  if (state.pos >= state.source.length) return node;
  
  const ch = state.source[state.pos];
  const start = state.pos;
  
  if (QUANTIFIERS[ch]) {
    state.pos++;
    let greedy = true;
    if (state.pos < state.source.length && state.source[state.pos] === '?') {
      greedy = false;
      state.pos++;
    }
    
    const qInfo = QUANTIFIERS[ch];
    const qNode = createNode(
      'quantifier',
      state.source.slice(start, state.pos),
      greedy ? qInfo.label : qInfo.label + '?',
      greedy ? qInfo.desc : qInfo.desc + ' (非贪婪模式)',
      start, state.pos,
      {
        min: qInfo.min,
        max: qInfo.max,
        greedy
      }
    );
    qNode.children = [node];
    return qNode;
  }
  
  if (ch === '{') {
    let braceEnd = state.pos + 1;
    while (braceEnd < state.source.length && state.source[braceEnd] !== '}') {
      braceEnd++;
    }
    
    const rangeStr = state.source.slice(state.pos + 1, braceEnd);
    const match = /^(\d+)(,(\d*)?)?$/.exec(rangeStr);
    
    if (match) {
      state.pos = braceEnd + 1;
      let greedy = true;
      if (state.pos < state.source.length && state.source[state.pos] === '?') {
        greedy = false;
        state.pos++;
      }
      
      const min = parseInt(match[1]);
      let max: number;
      let label: string;
      
      if (match[2] === undefined) {
        max = min;
        label = `{${min}}`;
      } else if (match[3] === '') {
        max = Infinity;
        label = `{${min},}`;
      } else {
        max = parseInt(match[3]);
        label = `{${min},${max}}`;
      }
      
      const qNode = createNode(
        'quantifier',
        state.source.slice(start, state.pos),
        greedy ? label : label + '?',
        `匹配 ${min} 到 ${max === Infinity ? '无限' : max} 次${greedy ? '' : ' (非贪婪模式)'}`,
        start, state.pos,
        { min, max, greedy }
      );
      qNode.children = [node];
      return qNode;
    }
  }
  
  return node;
}

export function parseRegex(regex: string): ParseNode {
  resetCounter();
  const state: ParserState = {
    source: regex,
    pos: 0,
    groupIndex: 1
  };
  
  const root = createNode('root', regex, regex, '根节点: 正则表达式整体', 0, regex.length);
  root.children = parseAlternation(state);
  
  return root;
}

export function generateRegex(node: ParseNode): string {
  switch (node.type) {
    case 'root':
      return node.children.map(generateRegex).join('');
    case 'literal':
      return node.value;
    case 'escape':
      return node.value;
    case 'dot':
      return '.';
    case 'anchor':
      return node.value;
    case 'charset': {
      const negated = node.params?.negated ? '^' : '';
      const charset = node.params?.charset || '';
      return `[${negated}${charset}]`;
    }
    case 'group': {
      if (node.params?.groupName) {
        return `(?<${node.params.groupName}>${node.children.map(generateRegex).join('')})`;
      }
      if (node.label.startsWith('(?:')) {
        return `(?:${node.children.map(generateRegex).join('')})`;
      }
      if (node.label.startsWith('(?=')) {
        return `(?=${node.children.map(generateRegex).join('')})`;
      }
      if (node.label.startsWith('(?!')) {
        return `(?!${node.children.map(generateRegex).join('')})`;
      }
      if (node.label.startsWith('(?<=')) {
        return `(?<=${node.children.map(generateRegex).join('')})`;
      }
      if (node.label.startsWith('(?<!')) {
        return `(?<!${node.children.map(generateRegex).join('')})`;
      }
      return `(${node.children.map(generateRegex).join('')})`;
    }
    case 'quantifier': {
      const child = node.children.map(generateRegex).join('');
      const greedy = node.params?.greedy === false ? '?' : '';
      const min = node.params?.min ?? 0;
      const max = node.params?.max ?? Infinity;
      
      if (min === 0 && max === Infinity) return `${child}*${greedy}`;
      if (min === 1 && max === Infinity) return `${child}+${greedy}`;
      if (min === 0 && max === 1) return `${child}?${greedy}`;
      if (max === Infinity) return `${child}{${min},}${greedy}`;
      if (min === max) return `${child}{${min}}${greedy}`;
      return `${child}{${min},${max}}${greedy}`;
    }
    case 'alternation': {
      return node.children.map(generateRegex).join('|');
    }
    default:
      return node.value;
  }
}

export function updateNodeParams(
  root: ParseNode,
  nodeId: string,
  newParams: Partial<ParseNode['params']>
): ParseNode {
  const updateNode = (node: ParseNode): ParseNode => {
    if (node.id === nodeId) {
      return { ...node, params: { ...node.params, ...newParams } };
    }
    return { ...node, children: node.children.map(updateNode) };
  };
  return updateNode(root);
}

export function deleteNode(root: ParseNode, nodeId: string): ParseNode {
  const deleteFromChildren = (children: ParseNode[]): ParseNode[] => {
    return children
      .filter(child => child.id !== nodeId)
      .map(child => ({
        ...child,
        children: deleteFromChildren(child.children)
      }));
  };
  
  return { ...root, children: deleteFromChildren(root.children) };
}
