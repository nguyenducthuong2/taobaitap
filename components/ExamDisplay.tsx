import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  PageBreak, 
  AlignmentType, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle 
} from "docx";

interface ExamDisplayProps {
  content: string;
}

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ content }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Parse the content into two parts based on the headers defined in SYSTEM_INSTRUCTION
  const { questionsPart, answersPart } = useMemo(() => {
    const part2Marker = "### PHẦN 2: ĐÁP ÁN VÀ LỜI GIẢI"; // Marker specific to Exercise mode
    
    // Check if the content contains the split marker
    if (content.includes(part2Marker)) {
      const [part1, part2] = content.split(part2Marker);
      return {
        questionsPart: part1.trim(),
        answersPart: `${part2Marker}\n${part2}`.trim() // Keep the header for Part 2
      };
    }
    
    // If Part 2 hasn't started generating yet, or in Lesson Plan mode (no Part 2 marker), everything is Part 1
    return {
      questionsPart: content.trim(),
      answersPart: ''
    };
  }, [content]);

  if (!content) return null;

  const handleDownloadWord = async () => {
    setIsDownloading(true);
    try {
      // --- Helper: Parse Inline Formatting (Bold, Italic, LaTeX) ---
      const parseTextRuns = (text: string): TextRun[] => {
        const runs: TextRun[] = [];
        // Regex to match **bold**, *italic*, or $latex$
        // Note: This is a simplified parser. 
        // Group 1: **bold**
        // Group 2: *italic*
        // Group 3: <u>underline</u>
        // Group 4: $latex$
        const regex = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(<u>[^<]+<\/u>)|(\$[^$]+\$)/g;
        
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
          // Push preceding plain text
          if (match.index > lastIndex) {
            runs.push(new TextRun({ 
              text: text.slice(lastIndex, match.index),
              font: "Times New Roman",
              size: 24
            }));
          }

          const fullMatch = match[0];
          
          if (match[1]) { // Bold
             runs.push(new TextRun({ 
               text: fullMatch.slice(2, -2), 
               bold: true,
               font: "Times New Roman",
               size: 24
             }));
          } else if (match[2]) { // Italic
            runs.push(new TextRun({ 
              text: fullMatch.slice(1, -1), 
              italics: true,
              font: "Times New Roman",
              size: 24
            }));
          } else if (match[3]) { // Underline
            runs.push(new TextRun({ 
              text: fullMatch.slice(3, -4), 
              underline: {},
              font: "Times New Roman",
              size: 24
            }));
          } else if (match[4]) { // LaTeX ($...$)
            runs.push(new TextRun({ 
              text: fullMatch, 
              color: "2E74B5", // Slight blue tint to indicate math/code
              font: "Cambria Math", // Preferred for math
              size: 24
            }));
          }

          lastIndex = regex.lastIndex;
        }

        // Push remaining text
        if (lastIndex < text.length) {
          runs.push(new TextRun({ 
            text: text.slice(lastIndex),
            font: "Times New Roman",
            size: 24
          }));
        }

        return runs;
      };

      // --- Helper: Process Markdown to Docx Elements ---
      const processMarkdownLines = (markdownText: string): (Paragraph | Table)[] => {
        const elements: (Paragraph | Table)[] = [];
        const lines = markdownText.split('\n');
        
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();

          // 1. Table Detection
          if (line.startsWith('|')) {
            const tableRows: TableRow[] = [];
            
            // Check if it's a valid table start
            while (i < lines.length && lines[i].trim().startsWith('|')) {
              const rowContent = lines[i].trim();
              
              // Skip delimiter row (e.g., |---|---|)
              if (rowContent.match(/^\|[\s-:]+\|[\s-:]+\|/)) {
                i++;
                continue;
              }

              // Parse cells
              // Remove first and last pipe if they exist to avoid empty first/last cells
              const cleanRow = rowContent.replace(/^\|/, '').replace(/\|$/, '');
              const cells = cleanRow.split('|').map(cellText => {
                return new TableCell({
                  children: [new Paragraph({ 
                    children: parseTextRuns(cellText.trim()),
                    alignment: AlignmentType.LEFT 
                  })],
                  width: { size: 100, type: WidthType.PERCENTAGE }, // Distribute evenly for now
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  },
                  margins: { top: 100, bottom: 100, left: 100, right: 100 }
                });
              });

              tableRows.push(new TableRow({ children: cells }));
              i++;
            }

            if (tableRows.length > 0) {
              elements.push(new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              }));
              // Add a spacer paragraph after table
              elements.push(new Paragraph({ text: "" })); 
            }
            continue; // Continue outer loop
          }

          // 2. Headings
          if (line.startsWith('#')) {
            let level = HeadingLevel.HEADING_1;
            let text = line;
            if (line.startsWith('### ')) { level = HeadingLevel.HEADING_3; text = line.replace('### ', ''); }
            else if (line.startsWith('## ')) { level = HeadingLevel.HEADING_2; text = line.replace('## ', ''); }
            else if (line.startsWith('# ')) { level = HeadingLevel.HEADING_1; text = line.replace('# ', ''); }

            elements.push(new Paragraph({
              text: text,
              heading: level,
              spacing: { before: 240, after: 120 }
            }));
            i++;
            continue;
          }

          // 3. Lists
          if (line.startsWith('- ') || line.startsWith('* ')) {
             elements.push(new Paragraph({
               children: parseTextRuns(line.replace(/^[-*] /, '')),
               bullet: { level: 0 },
               spacing: { after: 120 }
             }));
             i++;
             continue;
          }

          // 4. Regular Paragraphs
          if (line) {
             elements.push(new Paragraph({
               children: parseTextRuns(line),
               spacing: { after: 120 },
               alignment: AlignmentType.JUSTIFIED
             }));
          } else {
            // Empty line
            elements.push(new Paragraph({ text: "" }));
          }

          i++;
        }
        return elements;
      };

      // Construct the Document
      const docChildren = [
        new Paragraph({
          text: "EDUGEN VN - TÀI LIỆU TỰ ĐỘNG",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        ...processMarkdownLines(questionsPart)
      ];

      // Add Answers section if it exists
      if (answersPart) {
        docChildren.push(new Paragraph({
          children: [new PageBreak()]
        }));
        docChildren.push(...processMarkdownLines(answersPart));
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EduGen_TaiLieu_${new Date().toISOString().slice(0,10)}.docx`;
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
          Nội Dung Tài Liệu
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
        {/* Column 1: Questions / Content */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar border-b lg:border-b-0 ${answersPart ? 'lg:border-r' : ''} border-slate-200 p-6 min-h-[50%] lg:min-h-full`}>
           <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 mb-4 border-b border-slate-100">
             <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {answersPart ? 'Đề Bài' : 'Nội dung giáo án / Đề thi'}
             </span>
           </div>
           <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-slate-300 prose-td:p-2 prose-th:border prose-th:border-slate-300 prose-th:p-2 prose-th:bg-slate-100">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {questionsPart}
            </ReactMarkdown>
          </div>
        </div>

        {/* Column 2: Answers (Only visible if exists) */}
        {answersPart && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 min-h-[50%] lg:min-h-full">
             <div className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 pb-2 mb-4 border-b border-slate-100">
               <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Đáp Án & Lời Giải</span>
             </div>
             <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answersPart}
                </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};