
export enum Grade {
  Grade1 = '1',
  Grade2 = '2',
  Grade3 = '3',
  Grade4 = '4',
  Grade5 = '5',
  Grade6 = '6',
  Grade7 = '7',
  Grade8 = '8',
  Grade9 = '9',
  Grade10 = '10',
  Grade11 = '11',
  Grade12 = '12',
}

export enum QuestionType {
  MultipleChoice = 'Trắc nghiệm (4 lựa chọn)',
  TrueFalse = 'Trắc nghiệm Đúng - Sai',
  ShortAnswer = 'Điền đáp án / Trả lời ngắn',
  Essay = 'Bài tự luận',
  Mixed = 'Kết hợp (Khuyên dùng)',
}

export enum Difficulty {
  Recall = 'Nhận biết',
  Understanding = 'Thông hiểu',
  Application = 'Vận dụng',
  AdvancedApplication = 'Vận dụng cao',
  Mixed = 'Kết hợp',
}

export enum LiteratureAnswerType {
  Outline = 'Dàn ý gợi ý',
  FullEssay = 'Bài văn hoàn chỉnh',
}

export enum WorkMode {
  Exercise = 'exercise',
  lesson_plan = 'lesson_plan',
  presentation = 'presentation',
}

export const WorkModeMapping = {
  Exercise: 'exercise',
  LessonPlan: 'lesson_plan',
  Presentation: 'presentation'
};

export type LiteraturePageCount = 1 | 2 | 3 | 4 | 5;

export interface ExamRequest {
  mode: WorkMode;
  subject: string;
  grade: Grade;
  topic: string;
  specificRequirements?: string;
  additionalInstructions?: string;
  type: QuestionType;
  difficulty: Difficulty;
  questionCount: number;
  literatureAnswerType?: LiteratureAnswerType;
  literaturePageCount?: LiteraturePageCount;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
}
