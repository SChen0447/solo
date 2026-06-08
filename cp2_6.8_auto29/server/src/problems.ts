import type { Problem } from './types';

export const problems: Problem[] = [
  {
    id: 'p1',
    title: '两数之和',
    description: `编写一个函数 solution(input)，接收一个包含两个数字的数组 input，返回它们的和。

示例：
  输入: [1, 2]
  输出: 3

请确保你的函数名为 solution，并正确返回结果。`,
    template: `function solution(input) {
  // 在这里编写你的代码
  return input[0] + input[1];
}`,
    testCases: [
      { input: '[1, 2]', expectedOutput: '3' },
      { input: '[-5, 10]', expectedOutput: '5' },
      { input: '[0, 0]', expectedOutput: '0' },
    ],
  },
  {
    id: 'p2',
    title: '字符串反转',
    description: `编写一个函数 solution(input)，接收一个字符串 input，返回反转后的字符串。

示例：
  输入: "hello"
  输出: "olleh"

请确保你的函数名为 solution。`,
    template: `function solution(input) {
  // 在这里编写你的代码
  return input.split('').reverse().join('');
}`,
    testCases: [
      { input: '"hello"', expectedOutput: 'olleh' },
      { input: '"JavaScript"', expectedOutput: 'tpircSavaJ' },
      { input: '""', expectedOutput: '' },
    ],
  },
  {
    id: 'p3',
    title: '斐波那契数列',
    description: `编写一个函数 solution(input)，接收一个正整数 n，返回斐波那契数列的第 n 项。

斐波那契数列定义：
  F(1) = 1, F(2) = 1
  F(n) = F(n-1) + F(n-2)  (n > 2)

示例：
  输入: 6
  输出: 8

请确保你的函数名为 solution。`,
    template: `function solution(input) {
  // 在这里编写你的代码
  if (input <= 2) return 1;
  let a = 1, b = 1;
  for (let i = 3; i <= input; i++) {
    let c = a + b;
    a = b;
    b = c;
  }
  return b;
}`,
    testCases: [
      { input: '1', expectedOutput: '1' },
      { input: '6', expectedOutput: '8' },
      { input: '10', expectedOutput: '55' },
    ],
  },
  {
    id: 'p4',
    title: '数组去重',
    description: `编写一个函数 solution(input)，接收一个数组 input，返回去重后的新数组。

示例：
  输入: [1, 2, 2, 3, 3, 3]
  输出: [1,2,3]

请确保输出格式与示例一致。`,
    template: `function solution(input) {
  // 在这里编写你的代码
  return [...new Set(input)];
}`,
    testCases: [
      { input: '[1, 2, 2, 3]', expectedOutput: '[1,2,3]' },
      { input: '["a", "b", "a"]', expectedOutput: '["a","b"]' },
      { input: '[]', expectedOutput: '[]' },
    ],
  },
  {
    id: 'p5',
    title: '判断回文',
    description: `编写一个函数 solution(input)，接收一个字符串 input，判断它是否是回文字符串。

回文字符串是指正读和反读都相同的字符串。

示例：
  输入: "racecar"
  输出: true

  输入: "hello"
  输出: false

请确保你的函数返回布尔值。`,
    template: `function solution(input) {
  // 在这里编写你的代码
  const reversed = input.split('').reverse().join('');
  return input === reversed;
}`,
    testCases: [
      { input: '"racecar"', expectedOutput: 'true' },
      { input: '"hello"', expectedOutput: 'false' },
      { input: '"a"', expectedOutput: 'true' },
    ],
  },
];

export function getProblemById(id: string): Problem | undefined {
  return problems.find(p => p.id === id);
}
