
// @google/genai Coding Guidelines followed.
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION, PRESENTATION_INSTRUCTION } from "../constants";
import { ExamRequest, QuestionType, WorkMode } from "../types";

export const generateExamStream = async (
  request: ExamRequest,
  onChunk: (text: string) => void
): Promise<void> => {
  if (!process.env.API_KEY) {
    throw new Error("Không tìm thấy API Key hệ thống.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = SYSTEM_INSTRUCTION;
  let userPrompt = '';

  if (request.mode === WorkMode.lesson_plan) {
    systemInstruction = LESSON_PLAN_INSTRUCTION;
    userPrompt = `CHẾ ĐỘ: Giáo án NLS. Môn: ${request.subject}, Lớp: ${request.grade}, Bài: ${request.topic}. Dữ liệu: ${request.specificRequirements || 'N/A'}`;
  } else if (request.mode === WorkMode.presentation) {
    systemInstruction = PRESENTATION_INSTRUCTION;
    userPrompt = `CHẾ ĐỘ: Thiết kế Slide. Môn: ${request.subject}, Lớp: ${request.grade}, Chủ đề: ${request.topic}. Dữ liệu: ${request.specificRequirements || 'N/A'}`;
  } else {
    const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
    userPrompt = `Tạo bài tập: ${request.subject}, Lớp: ${request.grade}, Chủ đề: ${request.topic}, Loại: ${request.type}, Mức độ: ${request.difficulty}, Số câu: ${isLiterature ? '1' : request.questionCount}. Dữ liệu: ${request.specificRequirements || ''}`;
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-flash-lite-latest', 
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
      throw new Error("Hệ thống đang tạm thời quá tải do giới hạn của API miễn phí. Vui lòng đợi một lát rồi thử lại.");
    }
    throw error;
  }
};

export const generateImageFromAI = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `${prompt}, educational illustration style, clean and professional` }],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Không nhận được dữ liệu ảnh.");
  } catch (error: any) {
    console.error("Image API error:", error);
    throw error;
  }
};
