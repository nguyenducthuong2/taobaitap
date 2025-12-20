
// @google/genai Coding Guidelines followed.
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION, PRESENTATION_INSTRUCTION } from "../constants";
import { ExamRequest, QuestionType, WorkMode } from "../types";

export const generateExamStream = async (
  request: ExamRequest,
  onChunk: (text: string) => void
): Promise<void> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = SYSTEM_INSTRUCTION;
  let userPrompt = '';

  if (request.mode === WorkMode.lesson_plan) {
    systemInstruction = LESSON_PLAN_INSTRUCTION;
    userPrompt = `
    [MASTER DIRECTIVE] CHẾ ĐỘ: Soạn Giáo án NLS.
    - Môn: ${request.subject}, Lớp: ${request.grade}, Bài: ${request.topic}
    - Quy tắc: Mọi công thức toán học phải là mã LaTeX nằm trong cặp dấu $ đơn, văn bản KHÔNG định dạng bold/italic.
    - Tài liệu nguồn: 
    ${request.specificRequirements || 'Người dùng chưa cung cấp file, hãy soạn thảo dựa trên kiến thức chuẩn.'}
    `;
  } else if (request.mode === WorkMode.presentation) {
    systemInstruction = PRESENTATION_INSTRUCTION;
    userPrompt = `
    [MASTER DIRECTIVE: CONTENT-BASED DESIGNER]
    YÊU CẦU: Thiết kế Slide Bài Giảng DỰA TRÊN TÀI LIỆU NGUỒN.
    - Đối tượng: Học sinh lớp ${request.grade}, Môn ${request.subject}
    - Chủ đề chính: ${request.topic}
    - Quy tắc: Sử dụng LaTeX $ (dấu đô la đơn) cho toán học, văn bản thuần túy hoàn toàn không định dạng Markdown.
    
    TÀI LIỆU NGUỒN CẦN CHUYỂN HÓA:
    ${request.specificRequirements || 'KHÔNG CÓ TÀI LIỆU NGUỒN. Hãy dựa vào chủ đề để tạo bài giảng chuẩn.'}
    `;
  } else {
    const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
    userPrompt = `
      Tạo bài tập:
      - Môn: ${request.subject}, Lớp: ${request.grade}, Chủ đề: ${request.topic}
      - Loại: ${request.type}, Mức độ: ${request.difficulty}, Số câu: ${isLiterature ? '1' : request.questionCount}
      - YÊU CẦU QUAN TRỌNG: Hiển thị MỌI công thức/biểu thức toán học bằng mã LaTeX trong dấu $ đơn (Ví dụ: $x+y=1$). Văn bản KHÔNG ĐƯỢC định dạng in đậm hay in nghiêng, hãy viết bình thường.
      - Nguồn dữ liệu: ${request.specificRequirements || ''}
    `;
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Giảm temperature để tăng tính ổn định của định dạng
        thinkingConfig: { thinkingBudget: 4000 },
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

export const generateImageFromAI = async (prompt: string): Promise<string | null> => {
  if (!process.env.API_KEY) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `${prompt}, high quality educational graphic, clean, 16:9` }],
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
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};
