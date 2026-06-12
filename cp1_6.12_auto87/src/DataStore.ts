export interface Student {
  id: string;
  name: string;
  seatIndex: number;
  avatarColor: string;
  answers: AnswerRecord[];
  engagementScore: number;
}

export interface AnswerRecord {
  timestamp: number;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  correctOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  responseTime: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'correct' | 'wrong' | 'question';
}

export type DataEventType =
  | 'student-updated'
  | 'answer-submitted'
  | 'question-started'
  | 'question-ended'
  | 'log-added'
  | 'engagement-refreshed';

export type EventCallback = (data?: unknown) => void;

const AVATAR_COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#CE93D8', '#F06292'];

const STUDENT_NAMES = [
  '张伟', '王芳', '李明', '刘洋', '陈静',
  '杨磊', '赵敏', '黄涛', '周婷', '吴强',
  '徐丽', '孙浩', '朱琳', '马超', '胡雪',
  '郭鹏', '何娜', '高峰', '林燕', '罗军',
  '郑华', '梁红', '谢斌', '宋梅', '唐亮',
  '韩雪', '冯刚', '董玲', '萧然', '程勇',
  '曹丽', '袁杰', '邓敏', '许阳', '傅芳',
  '沈超', '曾悦', '彭波', '吕梦', '苏航',
  '蒋宇', '蔡琴', '贾明', '丁霞', '魏然',
  '薛磊', '叶青', '阎菲', '余俊', '潘蕊'
];

class DataStore {
  private students: Map<string, Student> = new Map();
  private logs: LogEntry[] = [];
  private readonly maxLogs = 50;
  private listeners: Map<DataEventType, Set<EventCallback>> = new Map();
  private activeQuestionId: string | null = null;
  private activeStudentId: string | null = null;
  private currentCorrectOption: 'A' | 'B' | 'C' | 'D' = 'A';
  private static instance: DataStore | null = null;

  private constructor() {
    this.initStudents();
  }

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private initStudents(): void {
    const gridSize = 8 * 6;
    const count = Math.min(STUDENT_NAMES.length, gridSize);

    for (let i = 0; i < count; i++) {
      const id = `student-${i}`;
      const student: Student = {
        id,
        name: STUDENT_NAMES[i],
        seatIndex: i,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        answers: [],
        engagementScore: 50,
      };
      this.students.set(id, student);
    }
  }

  on(event: DataEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: DataEventType, data?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  getStudents(): Student[] {
    return Array.from(this.students.values()).sort((a, b) => a.seatIndex - b.seatIndex);
  }

  getStudent(id: string): Student | undefined {
    return this.students.get(id);
  }

  getActiveQuestionId(): string | null {
    return this.activeQuestionId;
  }

  getActiveStudentId(): string | null {
    return this.activeStudentId;
  }

  getCurrentCorrectOption(): 'A' | 'B' | 'C' | 'D' {
    return this.currentCorrectOption;
  }

  startQuestion(studentId: string): { questionId: string; correctOption: 'A' | 'B' | 'C' | 'D' } {
    this.activeStudentId = studentId;
    this.activeQuestionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const options: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    this.currentCorrectOption = options[Math.floor(Math.random() * options.length)];

    const student = this.students.get(studentId);
    if (student) {
      this.addLog(`向 ${student.name} 发起提问`, 'question');
    }

    this.emit('question-started', { studentId, questionId: this.activeQuestionId });
    return { questionId: this.activeQuestionId, correctOption: this.currentCorrectOption };
  }

  endQuestion(): void {
    this.activeQuestionId = null;
    this.activeStudentId = null;
    this.emit('question-ended');
  }

  submitAnswer(
    studentId: string,
    questionId: string,
    selectedOption: 'A' | 'B' | 'C' | 'D',
    responseTime: number
  ): boolean {
    const student = this.students.get(studentId);
    if (!student || questionId !== this.activeQuestionId) {
      return false;
    }

    const isCorrect = selectedOption === this.currentCorrectOption;

    const record: AnswerRecord = {
      timestamp: Date.now(),
      questionId,
      selectedOption,
      correctOption: this.currentCorrectOption,
      isCorrect,
      responseTime,
    };

    student.answers.push(record);
    this.recalculateEngagement(student);
    this.students.set(studentId, student);

    if (isCorrect) {
      this.addLog(`${student.name} 回答正确（选${selectedOption}），响应时间 ${responseTime.toFixed(1)} 秒`, 'correct');
    } else {
      this.addLog(`${student.name} 回答错误（选${selectedOption}，正确答案${this.currentCorrectOption}），响应时间 ${responseTime.toFixed(1)} 秒`, 'wrong');
    }

    this.emit('answer-submitted', { studentId, record });
    this.emit('student-updated', student);

    return isCorrect;
  }

  private recalculateEngagement(student: Student): void {
    if (student.answers.length === 0) {
      student.engagementScore = 50;
      return;
    }

    const recent = student.answers.slice(-10);
    const correctRate = recent.filter((a) => a.isCorrect).length / recent.length;

    const avgResponseTime =
      recent.reduce((sum, a) => sum + a.responseTime, 0) / recent.length;
    const speedScore = Math.min(1, 1 / Math.max(avgResponseTime, 1));

    const raw = correctRate * 0.6 + speedScore * 0.4;
    student.engagementScore = Math.round(Math.max(0, Math.min(100, raw * 100)));
  }

  refreshAllEngagement(): void {
    this.students.forEach((student) => {
      this.recalculateEngagement(student);
    });
    this.emit('engagement-refreshed');
  }

  addLog(message: string, type: LogEntry['type'] = 'info'): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      message,
      type,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }

    this.emit('log-added', entry);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getEngagementColor(score: number): string {
    if (score <= 20) return '#B71C1C';
    if (score <= 40) return '#FF5722';
    if (score <= 60) return '#FFC107';
    if (score <= 80) return '#8BC34A';
    return '#4CAF50';
  }
}

export const dataStore = DataStore.getInstance();
