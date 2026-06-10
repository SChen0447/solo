export type QuestionType = 'single' | 'multiple' | 'rating';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  options: Option[];
  required: boolean;
}

export interface Survey {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: number;
}

export interface VoteAnswer {
  questionId: string;
  value: string | string[] | number;
}

export interface Vote {
  id: string;
  surveyId: string;
  answers: VoteAnswer[];
  submittedAt: number;
}

export interface QuestionStats {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  data: {
    label: string;
    count: number;
    percentage: number;
  }[];
  totalVotes: number;
}
