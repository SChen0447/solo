import { dataStore } from './DataStore';

type Option = 'A' | 'B' | 'C' | 'D';

export class MockDataGenerator {
  private autoAnswerTimer: number | null = null;
  private autoQuestionTimer: number | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleAutoQuestion();
  }

  stop(): void {
    this.isRunning = false;
    if (this.autoAnswerTimer !== null) {
      window.clearTimeout(this.autoAnswerTimer);
      this.autoAnswerTimer = null;
    }
    if (this.autoQuestionTimer !== null) {
      window.clearInterval(this.autoQuestionTimer);
      this.autoQuestionTimer = null;
    }
  }

  private scheduleAutoQuestion(): void {
    if (!this.isRunning) return;

    this.autoQuestionTimer = window.setInterval(() => {
      if (dataStore.getActiveQuestionId()) return;

      const students = dataStore.getStudents();
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      if (randomStudent) {
        dataStore.startQuestion(randomStudent.id);
        this.scheduleMockAnswer(randomStudent.id);
      }
    }, 8000 + Math.random() * 4000);
  }

  private scheduleMockAnswer(studentId: string): void {
    if (!this.isRunning) return;

    const questionId = dataStore.getActiveQuestionId();
    if (!questionId) return;

    const responseDelay = 3000 + Math.random() * 25000;
    const responseTimeSeconds = responseDelay / 1000;

    this.autoAnswerTimer = window.setTimeout(() => {
      if (!this.isRunning) return;
      if (dataStore.getActiveQuestionId() !== questionId) return;

      const options: Option[] = ['A', 'B', 'C', 'D'];
      const correctOption = dataStore.getCurrentCorrectOption();

      const isCorrect = Math.random() < 0.7;
      const selectedOption = isCorrect
        ? correctOption
        : options.filter((o) => o !== correctOption)[Math.floor(Math.random() * 3)];

      dataStore.submitAnswer(studentId, questionId, selectedOption, responseTimeSeconds);
      dataStore.endQuestion();
    }, responseDelay);
  }

  triggerRandomAnswer(studentId: string): void {
    const questionId = dataStore.getActiveQuestionId();
    if (!questionId || dataStore.getActiveStudentId() !== studentId) return;

    const responseDelay = 2000 + Math.random() * 15000;
    const responseTimeSeconds = responseDelay / 1000;

    window.setTimeout(() => {
      if (dataStore.getActiveQuestionId() !== questionId) return;

      const options: Option[] = ['A', 'B', 'C', 'D'];
      const correctOption = dataStore.getCurrentCorrectOption();

      const isCorrect = Math.random() < 0.75;
      const selectedOption = isCorrect
        ? correctOption
        : options.filter((o) => o !== correctOption)[Math.floor(Math.random() * 3)];

      dataStore.submitAnswer(studentId, questionId, selectedOption, responseTimeSeconds);
      dataStore.endQuestion();
    }, responseDelay);
  }

  static batchSimulateInitialAnswers(count: number = 3): void {
    const students = dataStore.getStudents();
    const options: Option[] = ['A', 'B', 'C', 'D'];

    students.forEach((student) => {
      for (let i = 0; i < count; i++) {
        const correctOption = options[Math.floor(Math.random() * options.length)];
        const isCorrect = Math.random() < 0.65;
        const selectedOption = isCorrect
          ? correctOption
          : options.filter((o) => o !== correctOption)[Math.floor(Math.random() * 3)];
        const responseTime = 3 + Math.random() * 25;

        student.answers.push({
          timestamp: Date.now() - (count - i) * 60000,
          questionId: `mock-q-${student.id}-${i}`,
          selectedOption,
          correctOption,
          isCorrect,
          responseTime,
        });
      }
    });

    dataStore.refreshAllEngagement();
  }
}

export const mockDataGenerator = new MockDataGenerator();
