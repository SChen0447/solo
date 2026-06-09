import type { SummaryCard, StyleType, SentencePosition } from '../../shared/types';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'our', 'their', 'mine', 'yours', 'his',
  'hers', 'ours', 'theirs', 'what', 'which', 'who', 'whom', 'whose',
  'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'if',
  'then', 'else', 'while', 'although', 'though', 'after', 'before',
  'since', 'until', 'unless', 'however', 'therefore', 'thus', 'hence',
  'also', 'besides', 'furthermore', 'moreover', 'nevertheless', 'nonetheless',
  'yet', 'still', 'already', 'always', 'never', 'ever', 'often', 'sometimes',
  'usually', 'about', 'into', 'through', 'during', 'between', 'under',
  'over', 'above', 'below', 'up', 'down', 'out', 'off', 'again', 'further',
  'once', 'here', 'there', 'any', 'anyone', 'anything', 'someone', 'something',
  'everything', 'nothing', 'everyone', 'one', 'two', 'three', 'four', 'five',
  'first', 'second', 'third', 'last', 'next', 'previous', 'new', 'old',
  'good', 'bad', 'big', 'small', 'long', 'short', 'high', 'low', 'right',
  'left', 'much', 'many', 'less', 'least', 'well', 'even', 'now', 'say',
  'said', 'says', 'make', 'made', 'makes', 'take', 'took', 'takes', 'get',
  'got', 'gets', 'go', 'went', 'goes', 'come', 'came', 'comes', 'see',
  'saw', 'sees', 'know', 'knew', 'knows', 'think', 'thought', 'thinks',
  'want', 'wanted', 'wants', 'use', 'used', 'uses', 'find', 'found', 'finds',
  'give', 'gave', 'gives', 'tell', 'told', 'tells', 'ask', 'asked', 'asks',
  'work', 'worked', 'works', 'seem', 'seemed', 'seems', 'feel', 'felt', 'feels',
  'try', 'tried', 'tries', 'leave', 'left', 'leaves', 'call', 'called', 'calls',
  '的', '了', '和', '是', '在', '我', '有', '他', '她', '它', '们', '这',
  '那', '个', '上', '下', '中', '里', '外', '前', '后', '左', '右', '不',
  '就', '都', '也', '很', '说', '要', '去', '你', '会', '着', '没有',
  '看', '好', '自己', '这', '那', '与', '及', '或', '等', '但', '而',
  '却', '虽', '然', '因', '为', '所', '以', '如', '果', '虽', '然',
  '即', '使', '不', '过', '还', '又', '再', '已', '经', '曾', '将',
  '要', '被', '把', '让', '向', '从', '到', '对', '于', '给', '为',
  '以', '及', '其', '之', '所', '该', '此', '些', '每', '各', '某',
  '任', '何', '若', '则', '并', '且', '或', '者', '而', '且', '与',
  '其', '实', '事', '情', '东', '西', '时', '候', '地', '方', '人',
  '物', '做', '来', '起', '过', '得', '么', '什', '怎', '哪', '多',
  '少', '几', '岁', '年', '月', '日', '点', '次', '回', '遍', '趟'
]);

export function splitSentences(text: string): SentencePosition[] {
  const positions: SentencePosition[] = [];
  const regex = /[^。！？.!?]+[。！？.!?]?/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence.length > 0) {
      positions.push({
        index,
        text: sentence,
        charStart: match.index,
        charEnd: match.index + match[0].length
      });
      index++;
    }
  }

  if (positions.length === 0 && text.trim().length > 0) {
    positions.push({
      index: 0,
      text: text.trim(),
      charStart: 0,
      charEnd: text.length
    });
  }

  return positions;
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const englishRegex = /[a-zA-Z]+/g;
  const chineseRegex = /[\u4e00-\u9fa5]/g;

  let match: RegExpExecArray | null;

  const englishText = text.match(englishRegex) || [];
  for (const word of englishText) {
    const lower = word.toLowerCase();
    if (!STOP_WORDS.has(lower) && lower.length > 1) {
      tokens.push(lower);
    }
  }

  while ((match = chineseRegex.exec(text)) !== null) {
    const char = match[0];
    if (!STOP_WORDS.has(char)) {
      tokens.push(char);
    }
  }

  return tokens;
}

export function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length;
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1 / Math.max(total, 1));
  }
  return tf;
}

export function computeIDF(sentenceTokens: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = sentenceTokens.length;
  const docFreq = new Map<string, number>();

  for (const tokens of sentenceTokens) {
    const unique = new Set(tokens);
    for (const token of unique) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }
  }

  for (const [token, freq] of docFreq) {
    idf.set(token, Math.log((totalDocs + 1) / (freq + 1)) + 1);
  }

  return idf;
}

export function computeTFIDF(
  tf: Map<string, number>,
  idf: Map<string, number>
): Map<string, number> {
  const tfidf = new Map<string, number>();
  for (const [token, tfVal] of tf) {
    const idfVal = idf.get(token) || 0;
    tfidf.set(token, tfVal * idfVal);
  }
  return tfidf;
}

export function sentenceScore(
  tokens: string[],
  idf: Map<string, number>
): number {
  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    score += idf.get(token) || 0;
  }

  return score / Math.sqrt(tokens.length);
}

export function extractKeySentences(
  text: string,
  topN: number = 5
): SummaryCard[] {
  const sentencePositions = splitSentences(text);

  if (sentencePositions.length === 0) {
    return [];
  }

  const sentenceTokens = sentencePositions.map(sp => tokenize(sp.text));
  const idf = computeIDF(sentenceTokens);

  const scored = sentencePositions.map((sp, i) => ({
    index: sp.index,
    sentence: sp.text,
    score: sentenceScore(sentenceTokens[i], idf),
    charStart: sp.charStart,
    charEnd: sp.charEnd
  }));

  scored.sort((a, b) => b.score - a.score);

  const numSentences = Math.min(topN, Math.max(3, Math.min(topN, Math.ceil(scored.length * 0.2))));
  const finalCount = Math.min(numSentences, scored.length);

  const top = scored.slice(0, Math.max(3, finalCount));
  top.sort((a, b) => a.index - b.index);

  const maxScore = top.length > 0 ? Math.max(...top.map(s => s.score)) : 1;

  return top.map(s => ({
    index: s.index,
    sentence: s.sentence,
    score: maxScore > 0 ? parseFloat((s.score / maxScore).toFixed(2)) : 0,
    charStart: s.charStart,
    charEnd: s.charEnd
  }));
}

export function applyStyle(sentence: string, style: StyleType, index: number, total: number): string {
  switch (style) {
    case 'formal':
      return applyFormalStyle(sentence, index, total);
    case 'concise':
      return applyConciseStyle(sentence);
    case 'vivid':
      return applyVividStyle(sentence, index);
    default:
      return sentence;
  }
}

function applyFormalStyle(sentence: string, index: number, total: number): string {
  let result = sentence;
  const trimmed = sentence.trim();

  if (index === 0) {
    if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
      result = '首先，' + trimmed;
    } else {
      result = 'First and foremost, ' + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }
  } else if (index === total - 1) {
    if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
      result = '最后，值得注意的是，' + trimmed;
    } else {
      result = 'Finally, it is worth noting that ' + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }
  } else {
    if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
      result = '其次，' + trimmed;
    } else {
      result = 'Furthermore, ' + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }
  }

  return result;
}

function applyConciseStyle(sentence: string): string {
  let result = sentence;

  result = result.replace(/值得注意的是，/g, '');
  result = result.replace(/需要指出的是，/g, '');
  result = result.replace(/换句话说，/g, '');
  result = result.replace(/事实上，/g, '');
  result = result.replace(/实际上，/g, '');
  result = result.replace(/基本上，/g, '');
  result = result.replace(/总体来说，/g, '');
  result = result.replace(/总的来说，/g, '');
  result = result.replace(/一般来说，/g, '');
  result = result.replace(/也就是说，/g, '');
  result = result.replace(/从根本上讲，/g, '');
  result = result.replace(/简而言之，/g, '');
  result = result.replace(/简单来说，/g, '');
  result = result.replace(/更重要的是，/g, '');
  result = result.replace(/更为重要的是，/g, '');

  result = result.replace(/\bFirst and foremost, /gi, '');
  result = result.replace(/\bFurthermore, /gi, '');
  result = result.replace(/\bMoreover, /gi, '');
  result = result.replace(/\bAdditionally, /gi, '');
  result = result.replace(/\bIn addition, /gi, '');
  result = result.replace(/\bHowever, /gi, '');
  result = result.replace(/\bNevertheless, /gi, '');
  result = result.replace(/\bTherefore, /gi, '');
  result = result.replace(/\bConsequently, /gi, '');
  result = result.replace(/\bAs a result, /gi, '');
  result = result.replace(/\bIn fact, /gi, '');
  result = result.replace(/\bActually, /gi, '');
  result = result.replace(/\bBasically, /gi, '');
  result = result.replace(/\bGenerally speaking, /gi, '');
  result = result.replace(/\bIn other words, /gi, '');
  result = result.replace(/\bIt is worth noting that /gi, '');

  result = result.replace(/[，,][^，,。.!?！？]*[性地地化]/g, '');

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

function applyVividStyle(sentence: string, index: number): string {
  let result = sentence;
  const trimmed = sentence.trim();

  if (index === 0) {
    if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
      result = '宛如一把钥匙，' + trimmed;
    } else {
      result = 'Like a key that unlocks understanding, ' + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }
  } else if (index % 2 === 0) {
    if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
      result = '恰恰是这一点，' + trimmed;
    } else {
      result = 'Precisely this point, ' + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }
  } else {
    if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
      result = '如同灯塔指引方向，' + trimmed;
    } else {
      result = 'Like a lighthouse guiding the way, ' + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }
  }

  return result;
}

export function processSummariesWithStyle(
  summaries: SummaryCard[],
  style: StyleType
): SummaryCard[] {
  return summaries.map((s, i) => ({
    ...s,
    styledSentence: applyStyle(s.sentence, style, i, summaries.length)
  }));
}
