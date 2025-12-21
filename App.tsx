
import React, { useState, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { ExamDisplay } from './components/ExamDisplay';
import { Grade, QuestionType, Difficulty, ExamRequest, WorkMode } from './types';
import { generateExamStream } from './services/geminiService';

const App: React.FC = () => {
  const [request, setRequest] = useState<ExamRequest>({
    mode: WorkMode.Exercise,
    subject: 'Toán',
    grade: Grade.Grade12,
    topic: '',
    specificRequirements: '',
    additionalInstructions: '',
    type: QuestionType.Mixed,
    difficulty: Difficulty.Mixed,
    questionCount: 10,
  });

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = useCallback((field: keyof ExamRequest, value: string | number) => {
    setRequest((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGenerate = async () => {
    if (!request.topic.trim()) {
      setError('Vui lòng nhập chủ đề hoặc tên bài học.');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setError(null);

    let accumulatedText = '';
    let lastUpdateTime = 0;

    try {
      await generateExamStream(request, (chunk) => {
        accumulatedText += chunk;
        const now = Date.now();
        if (now - lastUpdateTime > 50) { 
          setGeneratedContent(accumulatedText);
          lastUpdateTime = now;
        }
      });
      setGeneratedContent(accumulatedText);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">EDUGEN VN BY NGUYỄN ĐỨC THƯƠNG</h1>
            </div>
          </div>
          <div className="hidden sm:block text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            CỘNG ĐỒNG & MIỄN PHÍ
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <InputForm 
              request={request}
              onChange={handleInputChange}
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          <div className="lg:col-span-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-shake">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                 <span className="text-sm">{error}</span>
              </div>
            )}
            
            {(generatedContent || isGenerating) ? (
              <ExamDisplay 
                content={generatedContent} 
                isPresentationMode={request.mode === WorkMode.presentation}
                isGenerating={isGenerating}
              />
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-inner">
                <div className="bg-slate-50 p-6 rounded-full mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                </div>
                <p className="font-bold text-slate-600 text-lg">Studio Thiết kế AI sẵn sàng</p>
                <p className="text-sm px-12 text-center mt-2 text-slate-400 max-w-md">Nhập chủ đề bài học và nhấn "Tạo nội dung" để bắt đầu hành trình sáng tạo của bạn.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
