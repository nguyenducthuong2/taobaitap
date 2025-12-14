import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION } from "../constants";
import { ExamRequest, QuestionType, WorkMode } from "../types";

export const generateExamStream = async (
  request: ExamRequest,
  onChunk: (text: string) => void
): Promise<void> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  // Create a new instance for each request to ensure fresh config/key if needed
  const ai = new GoogleGenAI({ apiKey });

  let systemInstruction = SYSTEM_INSTRUCTION;
  let userPrompt = '';

  if (request.mode === WorkMode.LessonPlan) {
    // Mode: Soạn Giáo Án Năng Lực Số
    systemInstruction = LESSON_PLAN_INSTRUCTION;
    userPrompt = `
    Yêu cầu: Soạn giáo án tích hợp Năng lực số.
    - Môn học: ${request.subject}
    - Khối lớp: ${request.grade}
    - Tên bài học / Chủ đề: ${request.topic}
    - Nội dung giáo án gốc cần phân tích và tích hợp:
    
    ${request.specificRequirements ? request.specificRequirements : '[Người dùng chưa cung cấp nội dung, hãy tự soạn một giáo án mẫu dựa trên tên bài học]'}
    `;
  } else {
    // Mode: Tạo Bài Tập (Default)
    const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
    const isEssay = request.type === QuestionType.Essay;

    let extraPrompt = '';
    
    if (isLiterature || isEssay) {
      extraPrompt = `
      LƯU Ý ĐẶC BIỆT: Đây là yêu cầu tạo đề Văn / Bài tự luận.
      1. Số lượng câu hỏi: Chỉ tạo 01 câu duy nhất.
      2. Yêu cầu đáp án: BẮT BUỘC PHẢI BAO GỒM 2 PHẦN:
         - Phần 1: Dàn ý chi tiết.
         - Phần 2: Bài văn hoàn chỉnh (Độ dài khoảng ${request.literaturePageCount || 2} trang).
      `;
    }

    userPrompt = `
      Hãy tạo đề thi với các thông số sau:
      - Môn học: ${request.subject}
      - Khối lớp: ${request.grade}
      - Chủ đề: ${request.topic}
      - Dạng bài tập/Yêu cầu cụ thể: ${request.specificRequirements ? request.specificRequirements : 'Không có (Tạo bài tập bao quát cả chủ đề)'}
      - Loại câu hỏi: ${request.type}
      - Mức độ: ${request.difficulty}
      - Số lượng câu hỏi: ${isLiterature || isEssay ? '1 câu (Bài làm văn)' : request.questionCount}
      ${extraPrompt}
      
      Hãy lưu ý đặc thù của môn ${request.subject} ở lớp ${request.grade} để sử dụng ngôn ngữ và kiến thức phù hợp nhất.
    `;
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for faster, more deterministic results
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking to reduce latency (fix for "taking too long")
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Error generating exam:", error);
    throw error;
  }
};