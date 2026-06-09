export interface User {
  id: string;
  nickname: string;
  color: string;
  cursor: any;
  selection: any;
}

export interface CodeContent {
  html: string;
  css: string;
  js: string;
}

export interface Snapshot {
  id: string;
  code: CodeContent;
  timestamp: number;
  nickname: string;
  userId: string;
}

export type Language = 'html' | 'css' | 'js';
