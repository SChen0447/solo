export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  template: string;
  testCases?: TestCase[];
}

export interface JudgeResult {
  status: 'passed' | 'failed' | 'error' | 'timeout';
  time: number;
  message: string;
  actualOutput?: string;
  expectedOutput?: string;
  testCaseIndex?: number;
}

export interface SubmissionRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  timestamp: number;
  status: 'passed' | 'failed' | 'error' | 'timeout';
  time: number;
  code: string;
  result: JudgeResult;
}
