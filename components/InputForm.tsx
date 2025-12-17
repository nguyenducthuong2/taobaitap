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
  const isLiterature = request.subject === 'Ngữ văn / Tiếng Việt';
  const isEssayType = request.type === QuestionType.Essay;
  const isLessonPlanMode = request.mode === WorkMode.LessonPlan;

  // State and Refs for File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous states
    setFileError(null);
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
      } else {
        setFileError("Vui lòng chỉ tải lên file Word (.docx) hoặc file Text (.txt)");
        setFileName(null);
        onChange('specificRequirements', '');
      }
    } catch (err) {
      console.error("Error reading file:", err);
      setFileError("Không thể đọc file. File có thể bị lỗi hoặc được bảo vệ.");
    } finally {
      setIsReadingFile(false);
      // Reset input so user can re-select same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      
      {/* Mode Selection */}
      <div className="bg-slate-100 p-1 rounded-lg flex">
        {WORK_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChange('mode', mode.value)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              request.mode === mode.value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="border-b border-slate-100 pb-4 mb-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          {isLessonPlanMode ? 'Thông tin Giáo Án' : 'Cấu hình đề thi'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">Hỗ trợ tất cả các môn từ Lớp 1 đến Lớp 12 (Chương trình 2018)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Subject */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Môn học</label>
          <div className="relative">
            <select
              value={request.subject}
              onChange={(e) => onChange('subject', e.target.value)}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm appearance-none"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Khối Lớp</label>
          <div className="relative">
            <select
              value={request.grade}
              onChange={(e) => onChange('grade', e.target.value)}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm appearance-none"
            >
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Topic */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            {isLessonPlanMode ? 'Tên bài học' : 'Chủ đề (Nội dung kiến thức)'}
          </label>
          <input
            type="text"
            value={request.topic}
            onChange={(e) => onChange('topic', e.target.value)}
            placeholder={isLessonPlanMode ? "Ví dụ: Bài 5 - Nguyên phân, Giảm phân" : "Ví dụ: Phép cộng trong phạm vi 100, Câu đơn..."}
            className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm"
          />
        </div>

        {/* Specific Requirements / Lesson Content */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {isLessonPlanMode ? 'Tài liệu giáo án (Tải lên file Word)' : 'Dạng bài tập / Yêu cầu cụ thể (Tùy chọn)'}
          </label>
          
          {isLessonPlanMode ? (
            <div className="space-y-3">
              {/* File Upload Area */}
              <div 
                onClick={triggerFileUpload}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  fileName 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".docx,.txt" 
                  className="hidden" 
                />
                
                {isReadingFile ? (
                   <div className="flex flex-col items-center text-blue-600">
                      <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium">Đang đọc tài liệu...</span>
                   </div>
                ) : fileName ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <span className="font-semibold text-slate-800 text-sm mb-1">{fileName}</span>
                    <span className="text-xs text-blue-600 font-medium hover:underline">Nhấn để thay đổi file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span className="text-sm font-medium">Nhấn để tải file Word (.docx)</span>
                    <span className="text-xs mt-1 text-slate-400">Hỗ trợ tốt nhất cho file Word thông thường</span>
                  </div>
                )}
              </div>
              
              {fileError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                   {fileError}
                </p>
              )}

              {/* Preview Textarea (Read-only or Editable) */}
              <div className="relative">
                 <label className="text-xs font-semibold text-slate-500 mb-1 block">Nội dung đã đọc (Có thể chỉnh sửa):</label>
                 <textarea
                  value={request.specificRequirements || ''}
                  onChange={(e) => onChange('specificRequirements', e.target.value)}
                  placeholder="Nội dung giáo án sẽ hiển thị tại đây sau khi tải file..."
                  rows={6}
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-xs border transition-shadow shadow-sm resize-none font-mono"
                />
              </div>
            </div>
          ) : (
            <textarea
              value={request.specificRequirements || ''}
              onChange={(e) => onChange('specificRequirements', e.target.value)}
              placeholder="Ví dụ: Tập trung vào phân tích nhân vật..."
              rows={2}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm resize-none"
            />
          )}
        </div>

        {/* Hide extra fields if in Lesson Plan Mode */}
        {!isLessonPlanMode && (
          <>
            {/* Question Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Loại câu hỏi</label>
              <div className="relative">
                <select
                  value={request.type}
                  onChange={(e) => onChange('type', e.target.value)}
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm appearance-none"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Conditional Fields based on Subject/Type */}
            {isLiterature || isEssayType ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Độ dài bài văn mẫu (Dự kiến)</label>
                <div className="relative">
                  <select
                    value={request.literaturePageCount || 2}
                    onChange={(e) => onChange('literaturePageCount', parseInt(e.target.value))}
                    className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm appearance-none"
                  >
                    {LIT_PAGE_COUNTS.map((c) => (
                      <option key={c} value={c}>{c} trang (Khoảng {c * 400}-{c * 500} từ)</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Mức độ</label>
                  <div className="relative">
                    <select
                      value={request.difficulty}
                      onChange={(e) => onChange('difficulty', e.target.value)}
                      className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm appearance-none"
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Số lượng câu hỏi</label>
                  <div className="relative">
                    <select
                      value={request.questionCount}
                      onChange={(e) => onChange('questionCount', parseInt(e.target.value))}
                      className="block w-full rounded-lg border-slate-300 bg-slate-50 py-3 px-4 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow shadow-sm appearance-none"
                    >
                      {QUESTION_COUNTS.map((count) => (
                        <option key={count} value={count}>{count} câu</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={onSubmit}
          disabled={isGenerating || !request.topic.trim()}
          className={`w-full flex items-center justify-center py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all duration-200 shadow-md hover:shadow-lg ${
            isGenerating || !request.topic.trim()
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.99]'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isLessonPlanMode ? 'Đang phân tích và soạn giáo án...' : 'Đang khởi tạo đề thi...'}
            </>
          ) : (
            isLessonPlanMode ? 'Tích hợp NLS và Soạn Giáo Án' : 'Tạo Đề Thi Ngay'
          )}
        </button>
      </div>
    </div>
  );
};