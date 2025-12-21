


// @google/genai Coding Guidelines followed.
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION, PRESENTATION_INSTRUCTION } from "../constants";
import { ExamRequest, QuestionType, WorkMode } from "../types";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("Không tìm thấy API Key hệ thống. Vui lòng kiểm tra lại cấu hình.");
  }
  return key;
};

export const generateExamStream = async (
  request: ExamRequest,
  onChunk: (text: string) => void
): Promise<void> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let systemInstruction = SYSTEM_INSTRUCTION;
  let userPrompt = '';

  const additionalInstructions = request.additionalInstructions 
    ? `\n\nYÊU CẦU BỔ SUNG QUAN TRỌNG: ${request.additionalInstructions}` 
    : '';

  if (request.mode === WorkMode.lesson_plan) {
    systemInstruction = LESSON_PLAN_INSTRUCTION;
    userPrompt = `CHẾ ĐỘ: Giáo án NLS. Môn: ${request.subject}, Lớp: ${request.grade}, Bài: ${request.topic}. Dữ liệu: ${request.specificRequirements || 'N/A'}${additionalInstructions}`;
  } else if (request.mode === WorkMode.presentation) {
    systemInstruction = PRESENTATION_INSTRUCTION;
    userPrompt = `CHẾ ĐỘ: Thiết kế Slide. Môn: ${request.subject}, Lớp: ${request.grade}, Chủ đề: ${request.topic}. Dữ liệu giáo án: ${request.specificRequirements || 'N/A'}${additionalInstructions}`;
  } else {
    const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
    // FIX: Changed '1' to 1 to ensure the ternary expression consistently returns a number type, avoiding a `string | number` union that caused a type error.
    userPrompt = `Tạo bài tập: ${request.subject}, Lớp: ${request.grade}, Chủ đề: ${request.topic}, Loại: ${request.type}, Mức độ: ${request.difficulty}, Số câu: ${isLiterature ? 1 : request.questionCount}. Dữ liệu: ${request.specificRequirements || ''}${additionalInstructions}`;
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      // FIX: Upgraded model to the recommended 'gemini-3-flash-preview' for better performance and adherence to guidelines.
      model: 'gemini-3-flash-preview', 
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error: any) {
    if (error.message?.includes("429")) {
      throw new Error("Lỗi 429: Hết hạn ngạch API. Hệ thống miễn phí có thể đang quá tải, vui lòng thử lại sau ít phút.");
    }
     if (error.message?.toLowerCase().includes("api key not valid")) {
      throw new Error("API Key hệ thống không hợp lệ. Vui lòng liên hệ quản trị viên.");
    }
    throw error;
  }
};
