import { spawn } from 'child_process';
import type { Problem, JudgeResult, TestCase } from './types';

const TIME_LIMIT_MS = 3000;

function sanitizeCode(code: string): string {
  const forbiddenPatterns = [
    /require\s*\(/g,
    /import\s+.+from\s+['"]/g,
    /process\./g,
    /child_process/g,
    /fs\./g,
    /fs\s*[/\\]/g,
    /__dirname/g,
    /__filename/g,
    /eval\s*\(/g,
    /Function\s*\(/g,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(code)) {
      throw new Error('代码中包含危险操作，已被阻止执行');
    }
  }

  return code;
}

function buildTestScript(code: string, testCase: TestCase): string {
  return `
"use strict";
const console = {
  log: (...args) => {
    process.stdout.write(args.map(String).join(' ') + '\\n');
  },
  error: (...args) => {
    process.stderr.write(args.map(String).join(' ') + '\\n');
  },
  warn: (...args) => {
    process.stderr.write(args.map(String).join(' ') + '\\n');
  }
};

${code}

try {
  const input = ${JSON.stringify(testCase.input)};
  const result = solution(input);
  if (result !== undefined) {
    console.log(result);
  }
} catch (e) {
  process.stderr.write(String(e.message || e));
  process.exit(1);
}
`;
}

function runTestCase(code: string, testCase: TestCase, index: number): Promise<JudgeResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let timedOut = false;

    try {
      sanitizeCode(code);
    } catch (e: any) {
      resolve({
        status: 'error',
        time: 0,
        message: e.message,
        testCaseIndex: index,
      });
      return;
    }

    const testScript = buildTestScript(code, testCase);

    const child = spawn(process.execPath, ['--eval', testScript], {
      timeout: TIME_LIMIT_MS,
      env: {
        PATH: process.env.PATH,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 500);
    }, TIME_LIMIT_MS);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (timedOut) {
        resolve({
          status: 'timeout',
          time: TIME_LIMIT_MS,
          message: '代码执行超时（超过 3 秒）',
          testCaseIndex: index,
        });
        return;
      }

      if (stderr.trim() || code !== 0) {
        resolve({
          status: 'error',
          time: elapsed,
          message: stderr.trim() || `进程退出码: ${code}`,
          testCaseIndex: index,
        });
        return;
      }

      const actualOutput = stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();

      const actualLines = actualOutput.split('\n').map(l => l.trim());
      const expectedLines = expectedOutput.split('\n').map(l => l.trim());

      let passed = actualLines.length === expectedLines.length;
      if (passed) {
        for (let i = 0; i < actualLines.length; i++) {
          if (actualLines[i] !== expectedLines[i]) {
            passed = false;
            break;
          }
        }
      }

      if (passed) {
        resolve({
          status: 'passed',
          time: elapsed,
          message: `测试用例 ${index + 1} 通过`,
          actualOutput,
          expectedOutput,
          testCaseIndex: index,
        });
      } else {
        resolve({
          status: 'failed',
          time: elapsed,
          message: `测试用例 ${index + 1} 未通过`,
          actualOutput,
          expectedOutput,
          testCaseIndex: index,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      resolve({
        status: 'error',
        time: elapsed,
        message: `执行错误: ${err.message}`,
        testCaseIndex: index,
      });
    });
  });
}

export async function judgeCode(code: string, problem: Problem): Promise<JudgeResult> {
  for (let i = 0; i < problem.testCases.length; i++) {
    const result = await runTestCase(code, problem.testCases[i], i);
    if (result.status !== 'passed') {
      return result;
    }
  }

  const allResults = await Promise.all(
    problem.testCases.map((tc, i) => runTestCase(code, tc, i))
  );

  const totalTime = allResults.reduce((sum, r) => sum + r.time, 0);

  return {
    status: 'passed',
    time: totalTime,
    message: `全部 ${problem.testCases.length} 个测试用例通过`,
  };
}
