import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType } from "docx";

interface ExamDisplayProps {
  content: string;
}

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ content }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Parse the content into two parts based on the headers defined in SYSTEM_INSTRUCTION
  const { questionsPart, answersPart } = useMemo(() => {
    const part2Marker = "### PHẦN 2: ĐÁP ÁN VÀ LỜI GIẢI";
    
    // Check if the content contains the split marker
    if (content.includes(part2Marker)) {
      const [part1, part2] = content.split(part2Marker);
      return {
        questionsPart: part1.trim(),
        answersPart: `${part2Marker}\n${part2}`.trim() // Keep the header for Part 2
      };
    }
    
    // If Part 2 hasn't started generating yet, everything is Part 1
    return {
      questionsPart: content.trim(),
      answersPart: ''
    };
  }, [content]);

  if (!content) return null;

  const handleDownloadWord = async () => {
    setIsDownloading(true);
    try {
      const createParagraphsFromMarkdown = (text: string) => {
        return text.split('\n').map(line => {
          const cleanLine = line.trim();
          if (!cleanLine) return new Paragraph({ text: "" });

          // Headers
          if (cleanLine.startsWith('### ')) {
            return new Paragraph({
              text: cleanLine.replace('### ', ''),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 120 }
            });
          }
          if (cleanLine.startsWith('## ')) {
             return new Paragraph({
              text: cleanLine.replace('## ', ''),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 }
            });
          }

          // Bold detection for "Câu X:"
          // Simple heuristic: if line starts with "**Câu" or "Câu" followed by number
          const children: TextRun[] = [];
          
          // Regex to identify "Câu X:" pattern or similar bold markers
          // This is a basic parser. For full markdown support in docx, a heavier library is needed.
          // Here we just ensure Question titles are bold.
          if (cleanLine.match(/^(Câu \d+:|Bài \d+:)/) || cleanLine.startsWith('**Câu')) {
             children.push(new TextRun({ 
               text: cleanLine.replace(/\*\*/g, ''), 
               bold: true,
               size: 24, // 12pt
               font: "Times New Roman"
             }));
          } else {
             // Normal text
             children.push(new TextRun({ 
               text: cleanLine.replace(/\*\*/g, ''), // Strip bold markers for cleanliness
               size: 24,
               font: "Times New Roman"
             }));
          }

          return new Paragraph({
            children: children,
            spacing: { after: 120 }
          });
        });
      };

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "ĐỀ THI TOÁN - TẠO BỞI MATHGEN VN",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...createParagraphsFromMarkdown(questionsPart),
            new Paragraph({
              children: [new PageBreak()]
            }),
            new Paragraph({
              text: "ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 400 }
            }),
            ...createParagraphsFromMarkdown(answersPart)
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `De_Thi_MathGen_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating Word document:", error);
      alert("Có lỗi khi tạo file Word. Vui lòng thử lại.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] lg:h-[900px]">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Nội Dung Đề Thi
        </h3>
        <button
          onClick={handleDownloadWord}
          disabled={isDownloading}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tạo file...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Tải về Word (.docx)
            </>
          )}
        </button>
      </div>
      
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden bg-white">
        {/* Column 1: Questions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 p-6 min-h-[50%] lg:min-h-full">
           <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 mb-4 border-b border-slate-100">
             <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Đề Bài</span>
           </div>
           <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {questionsPart}
            </ReactMarkdown>
          </div>
        </div>

        {/* Column 2: Answers */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 min-h-[50%] lg:min-h-full">
           <div className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 pb-2 mb-4 border-b border-slate-100">
             <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Đáp Án & Lời Giải</span>
           </div>
           <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
            {answersPart ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answersPart}
              </ReactMarkdown>
            ) : (
               <div className="flex items-center justify-center h-40 text-slate-400 italic text-sm">
                 Đáp án sẽ hiển thị tại đây sau khi đề bài được tạo xong...
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};