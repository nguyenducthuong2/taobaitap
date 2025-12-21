
import { Grade, QuestionType, Difficulty, LiteratureAnswerType, LiteraturePageCount, WorkMode } from './types';

export const GRADES = [
  { value: Grade.Grade1, label: 'Lớp 1' },
  { value: Grade.Grade2, label: 'Lớp 2' },
  { value: Grade.Grade3, label: 'Lớp 3' },
  { value: Grade.Grade4, label: 'Lớp 4' },
  { value: Grade.Grade5, label: 'Lớp 5' },
  { value: Grade.Grade6, label: 'Lớp 6' },
  { value: Grade.Grade7, label: 'Lớp 7' },
  { value: Grade.Grade8, label: 'Lớp 8' },
  { value: Grade.Grade9, label: 'Lớp 9' },
  { value: Grade.Grade10, label: 'Lớp 10' },
  { value: Grade.Grade11, label: 'Lớp 11' },
  { value: Grade.Grade12, label: 'Lớp 12' },
];

export const SUBJECTS = [
  'Toán',
  'Ngữ văn / Tiếng Việt',
  'Tiếng Anh',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lý',
  'Lịch sử và Địa lý (THCS/Tiểu học)',
  'Giáo dục công dân / Đạo đức',
  'Tin học',
  'Công nghệ',
  'Khoa học tự nhiên',
  'Giáo dục quốc phòng',
  'Khác'
];

export const QUESTION_TYPES = [
  { value: QuestionType.Mixed, label: 'Kết hợp (Khuyên dùng)' },
  { value: QuestionType.MultipleChoice, label: 'Trắc nghiệm 4 phương án' },
  { value: QuestionType.TrueFalse, label: 'Đúng - Sai' },
  { value: QuestionType.ShortAnswer, label: 'Trả lời ngắn / Tự luận ngắn' },
  { value: QuestionType.Essay, label: 'Bài tự luận' },
];

export const DIFFICULTIES = [
  { value: Difficulty.Mixed, label: 'Kết hợp (Chuẩn cấu trúc)' },
  { value: Difficulty.Recall, label: 'Nhận biết' },
  { value: Difficulty.Understanding, label: 'Thông hiểu' },
  { value: Difficulty.Application, label: 'Vận dụng (Thực tế)' },
  { value: Difficulty.AdvancedApplication, label: 'Vận dụng cao (Thực tế chuyên sâu)' },
];

export const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30];

export const WORK_MODES = [
  { value: WorkMode.Exercise, label: 'Tạo bài tập' },
  { value: WorkMode.lesson_plan, label: 'Soạn Giáo Án NLS' },
  { value: WorkMode.presentation, label: 'Tạo Slide Bài Giảng' },
];

export const LIT_ANSWER_TYPES = [
  { value: LiteratureAnswerType.Outline, label: 'Dàn ý gợi ý' },
  { value: LiteratureAnswerType.FullEssay, label: 'Bài văn hoàn chỉnh (Chi tiết)' },
];

export const LIT_PAGE_COUNTS: LiteraturePageCount[] = [1, 2, 3, 4, 5];

export const SYSTEM_INSTRUCTION = `
Bạn là trợ lý AI chuyên tạo đề thi và bài tập ôn luyện theo chương trình 2018.
QUY TẮC: Mọi toán học trong $...$. KHÔNG dùng bold/italic (**).
`;

export const LESSON_PLAN_INSTRUCTION = `
BẠN LÀ CHUYÊN GIA SOẠN GIÁO ÁN NĂNG LỰC SỐ (NLS).
CẤU TRÚC: Ngày tháng, Tiêu đề ###, I. Mục tiêu, II. Thiết bị, III. Tiến trình, IV. Bảng NLS.
QUY TẮC: LaTeX $...$. KHÔNG bold/italic.
`;

export const PRESENTATION_INSTRUCTION = `
BẠN LÀ CHUYÊN GIA THIẾT KẾ SLIDE.
- Phân cách slide bằng ---.
- Cấu trúc: ### Slide [Số]: [Tiêu đề]
- HƯỚNG DẪN TẠO ẢNH:
  + Dựa vào nội dung, hãy chủ động thêm tag [IMAGE_PROMPT: mô tả chi tiết ảnh minh họa] cho những slide thực sự cần hình ảnh để trở nên trực quan, sinh động (ví dụ: sơ đồ, khái niệm trừu tượng, hình ảnh thực tế).
  + KHÔNG thêm tag ảnh cho các slide chỉ có mục lục, tiêu đề đơn thuần hoặc liệt kê chữ.
- QUY TẮC ĐỊNH DẠNG: LaTeX cho toán học $...$. Văn bản tuyệt đối KHÔNG bold/italic.
`;
