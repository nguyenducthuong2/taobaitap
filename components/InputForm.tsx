
import React, { useRef, useState } from 'react';
import * as mammoth from 'mammoth';
import { GRADES, QUESTION_TYPES, DIFFICULTIES, QUESTION_COUNTS, SUBJECTS, LIT_PAGE_COUNTS, WORK_MODES } from '../constants';
import { ExamRequest, QuestionType, WorkMode } from '../types';

interface InputFormProps {
  request: ExamRequest;
  onChange: (field: keyof ExamRequest, value: string | number) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({
  request,
  onChange,
  onSubmit,
  isGenerating,
}) => {
  const isDocUploadMode = request.mode === WorkMode.lesson_plan || request.mode === WorkMode.presentation;
  const isPresentationMode = request.mode === WorkMode.presentation;
  const isExerciseMode = request.mode === WorkMode.Exercise;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);

  const QUICK_SUGGESTIONS = isPresentationMode ? [
    "Phong cách vui nhộn",
    "Nâng cao/Chuyên sâu",
    "Nhiều ví dụ thực tế",
    "Thêm slide trò chơi",
    "Tối giản & Hiện đại"
  ] : (isExerciseMode ? [] : [
    "Tập trung thực hành",
    "Liên hệ thực tế Việt Nam",
    "Dễ hiểu/Trực quan",
    "Câu hỏi tư duy sáng tạo"
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsReadingFile(true);
    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onChange('specificRequirements', result.value);
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        onChange('specificRequirements', text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReadingFile(false);
    }
  };

  const addSuggestion = (s: string) => {
    const current = request.additionalInstructions || '';
    onChange('additionalInstructions', current ? `${current}, ${s.toLowerCase()}` : s);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="bg-slate-100 p-1 rounded-lg flex overflow-hidden">
        {WORK_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChange('mode', mode.value)}
            className={`flex-1 py-2 px-2 rounded-md text-[13px] font-bold transition-all duration-200 ${
              request.mode === mode.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          {isPresentationMode ? 'Thiết kế Slide Bài Giảng AI' : isDocUploadMode ? 'Soạn Giáo Án NLS' : 'Cấu hình Bài tập'}
        </h2>
        <p className="text-[12px] text-slate-500 mt-1 uppercase font-bold tracking-tight">
          Hỗ trợ tất cả các môn từ Lớp 1 đến Lớp 12 (Chương trình 2018)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Môn học</label>
          <select value={request.subject} onChange={(e) => onChange('subject', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2.5 px-3 text-sm focus:ring-blue-500 border appearance-none">
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Khối Lớp</label>
          <select value={request.grade} onChange={(e) => onChange('grade', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2.5 px-3 text-sm focus:ring-blue-500 border appearance-none">
            {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">{isDocUploadMode ? 'Tên bài giảng / bài học' : 'Chủ đề kiến thức'}</label>
          <input
            type="text"
            value={request.topic}
            onChange={(e) => onChange('topic', e.target.value)}
            placeholder="Ví dụ: Quy luật phân ly của Men-đen"
            className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2.5 px-4 text-sm focus:ring-blue-500 border"
          />
        </div>

        {!isExerciseMode && (
          <div className="space-y-3 md:col-span-2">
            <label className="block text-sm font-bold text-slate-700">Yêu cầu bổ sung (Tùy chọn)</label>
            <textarea
              value={request.additionalInstructions || ''}
              onChange={(e) => onChange('additionalInstructions', e.target.value)}
              placeholder="Ví dụ: Trình bày súc tích, ngôn ngữ trẻ trung, thêm slide bài tập củng cố..."
              rows={2}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2.5 px-4 text-sm focus:ring-blue-500 border resize-none"
            />
            {QUICK_SUGGESTIONS.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {QUICK_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => addSuggestion(s)}
                    className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-colors border border-slate-200"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-bold text-blue-700">
            {isExerciseMode ? 'Trợ lý AI thông minh (Hiểu mọi yêu cầu nội dung)' : isDocUploadMode ? 'Tài liệu nguồn (Bắt buộc để đạt hiệu quả cao nhất)' : 'Nội dung chi tiết (Nếu có)'}
          </label>
          
          {isDocUploadMode ? (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-all ${fileName ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".docx,.txt" className="hidden" />
                {isReadingFile ? <span className="animate-pulse flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang trích xuất dữ liệu...</span> : fileName ? <div className="flex flex-col items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span className="font-bold text-blue-700 text-sm">{fileName}</span><span className="text-[10px] text-blue-400">Đã sẵn sàng để chuyển đổi</span></div> : <div className="flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg><span className="text-slate-500 text-sm">Tải file Word tài liệu nguồn (.docx)</span></div>}
              </div>
              <textarea
                value={request.specificRequirements || ''}
                onChange={(e) => onChange('specificRequirements', e.target.value)}
                placeholder="Nội dung văn bản từ file sẽ xuất hiện tại đây. AI sẽ dựa hoàn toàn vào đây để thiết kế Slide."
                rows={4}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2.5 px-4 text-[11px] border resize-none font-mono text-slate-600 leading-relaxed shadow-inner"
              />
            </div>
          ) : (
            <textarea
              value={request.specificRequirements || ''}
              onChange={(e) => onChange('specificRequirements', e.target.value)}
              placeholder={isExerciseMode ? "Nhập yêu cầu chi tiết của bạn về nội dung, vấn đề tạo câu hỏi hoặc dán văn bản bài học để Trợ lý AI hiểu và tạo bài tập cho tất cả các môn học..." : "Nhập ghi chú hoặc đoạn văn bản gốc để AI tạo bài tập..."}
              rows={3}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2.5 px-4 text-sm focus:ring-blue-500 border resize-none shadow-inner"
            />
          )}
        </div>

        {!isDocUploadMode && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Loại câu hỏi</label>
              <select value={request.type} onChange={(e) => onChange('type', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2 px-3 text-sm border">
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Mức độ</label>
              <select value={request.difficulty} onChange={(e) => onChange('difficulty', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-slate-50 py-2 px-3 text-sm border">
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            {isExerciseMode && (
              <div className="space-y-2 md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Số lượng câu hỏi: từ 5 câu đến 30 câu
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {QUESTION_COUNTS.map((count) => (
                    <button
                      key={count}
                      onClick={() => onChange('questionCount', count)}
                      className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                        request.questionCount === count 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={onSubmit}
          disabled={isGenerating || !request.topic.trim()}
          className={`w-full flex items-center justify-center py-4 rounded-lg text-white font-bold text-lg transition-all shadow-lg active:scale-95 gap-3 ${isPresentationMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-slate-400`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>{isPresentationMode ? "Đang chuyển hóa tài liệu..." : "Đang xử lý..."}</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path></svg>
              <span>{isPresentationMode ? "Thiết kế Slide từ tài liệu" : "Tạo Nội Dung Ngay"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
