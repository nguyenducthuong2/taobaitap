
import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import pptxgen from "pptxgenjs";
import { generateImageFromAI } from '../services/geminiService';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign
} from "docx";

interface ExamDisplayProps {
  content: string;
  isPresentationMode?: boolean;
  isGenerating?: boolean;
}

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ content, isPresentationMode, isGenerating }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [imagesMap, setImagesMap] = useState<Record<number, string>>({});
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, string>>({});

  const slidesRawData = useMemo(() => {
    if (!isPresentationMode) return [];
    return content.split(/---/).filter(s => s.trim().length > 5);
  }, [content, isPresentationMode]);

  useEffect(() => {
    if (!isPresentationMode || isGenerating || slidesRawData.length === 0) return;
    
    const prompts = slidesRawData.map((s, idx) => ({ idx, text: s })).filter(s => s.text.includes('[IMAGE_PROMPT:'));
    const missingIndices = prompts.filter(p => !imagesMap[p.idx] && !imageErrorMap[p.idx]);

    if (missingIndices.length === 0) {
      setIsProcessingImages(false);
      return;
    }

    const processImages = async () => {
      setIsProcessingImages(true);
      for (const item of missingIndices) {
        const match = item.text.match(/\[IMAGE_PROMPT:\s*(.*?)\]/);
        if (match && match[1]) {
          try {
            // Thêm delay 3 giây giữa các yêu cầu tạo ảnh để không bị lỗi Quota 429 trên bản miễn phí
            if (item !== missingIndices[0]) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            const imgData = await generateImageFromAI(match[1]);
            setImagesMap(prev => ({ ...prev, [item.idx]: imgData }));
            setImageErrorMap(prev => {
              const newErrors = { ...prev };
              delete newErrors[item.idx];
              return newErrors;
            });
          } catch (err: any) {
            console.error("Lỗi tạo ảnh cho slide", item.idx, err);
            const errorMessage = err.message || "Lỗi không xác định.";
            if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
               setImageErrorMap(prev => ({ ...prev, [item.idx]: "Hết lượt tạo ảnh miễn phí (RPM). Đang thử lại..." }));
               // Nếu lỗi quota, đợi lâu hơn rồi thử lại hoặc bỏ qua
               await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
               setImageErrorMap(prev => ({ ...prev, [item.idx]: "Không thể tạo ảnh cho slide này." }));
            }
          }
        }
      }
      setIsProcessingImages(false);
    };
    
    processImages();
  }, [isGenerating, isPresentationMode, slidesRawData, imagesMap, imageErrorMap]);

  const NLS_PATTERN = /(\d+\.\d+\.[A-Z]{2,3}\d+[a-z]?)/g;

  // Hàm tiện ích để làm sạch văn bản (xóa dấu $)
  const cleanPptxText = (text: string) => {
    return text.replace(/\$/g, '').trim();
  };

  const createStyledRuns = (text: string, isHeader: boolean = false) => {
    const parts = text.split(NLS_PATTERN);
    return parts.map((part, index) => {
      const isNLS = NLS_PATTERN.test(part);
      NLS_PATTERN.lastIndex = 0;
      return new TextRun({
        text: part,
        bold: isNLS || isHeader,
        color: isNLS ? "0000FF" : undefined,
        size: 24,
      });
    });
  };

  const handleDownloadWord = async () => {
    setIsExporting(true);
    try {
      const lines = [...content.split('\n'), ""];
      const children: any[] = [];
      let currentTableRows: string[][] = [];
      let isCollectingTable = false;

      const flushTable = () => {
        if (currentTableRows.length > 0) {
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: currentTableRows.map((row, idx) => new TableRow({
              children: row.map(cell => new TableCell({
                children: [new Paragraph({ 
                  children: createStyledRuns(cell, idx === 0),
                  alignment: idx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT
                })],
                verticalAlign: VerticalAlign.CENTER,
                shading: idx === 0 ? { fill: "F2F2F2" } : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                }
              }))
            }))
          }));
          children.push(new Paragraph({ text: "" }));
          currentTableRows = [];
        }
        isCollectingTable = false;
      };

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('|')) {
          isCollectingTable = true;
          const cells = trimmed.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
          if (!cells.every(c => c.includes('---'))) {
            currentTableRows.push(cells);
          }
        } else {
          if (isCollectingTable) {
            flushTable();
          }

          if (trimmed.startsWith('### ')) {
            const headingText = trimmed.replace('### ', '').replace(/\*\*/g, '');
            children.push(new Paragraph({
              text: headingText,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              bold: true
            }));
          } else if (trimmed && !trimmed.includes('[IMAGE_PROMPT')) {
            children.push(new Paragraph({
              children: createStyledRuns(trimmed),
              spacing: { before: 80, after: 80 },
            }));
          }
        }
      });

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: "GIÁO ÁN PHÁT TRIỂN NĂNG LỰC SỐ (NLS)",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 }
            }),
            ...children
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `GiaoAn_EduGen_${Date.now()}.docx`;
      link.click();
    } catch (error) {
      console.error("Lỗi khi tạo file Word:", error);
    } finally { setIsExporting(false); }
  };

  const handleDownloadPptx = async () => {
    setIsExporting(true);
    try {
      const PptxGenConstructor = (pptxgen as any).default || pptxgen;
      const pres = new PptxGenConstructor();
      pres.layout = 'LAYOUT_16x9';

      slidesRawData.forEach((slideRaw, idx) => {
        const slide = pres.addSlide();
        const lines = slideRaw.trim().split('\n');
        let title = "NỘI DUNG BÀI GIẢNG";
        let bodyLines: string[] = [];
        
        lines.forEach(l => {
          const cleanLine = l.trim();
          if (cleanLine.startsWith('### ')) {
            // Xóa dấu $ khỏi tiêu đề slide
            title = cleanPptxText(cleanLine.replace('### ', ''));
          } else if (cleanLine && !cleanLine.includes('[IMAGE_PROMPT')) {
            // Xóa dấu $ khỏi nội dung slide
            bodyLines.push(cleanPptxText(cleanLine));
          }
        });

        slide.background = { fill: "F8FAFC" };

        slide.addText(title.toUpperCase(), { 
          x: 0.5, y: 0.2, w: 9.0, h: 0.8, 
          fontSize: 24, bold: true, color: '1E3A8A',
          align: 'center', valign: 'middle' 
        });

        const hasImage = !!imagesMap[idx];
        const bodyW = hasImage ? 5.8 : 9.0;
        
        let fontSize = 18;
        if (bodyLines.length > 12) fontSize = 11;
        else if (bodyLines.length > 10) fontSize = 13;
        else if (bodyLines.length > 8) fontSize = 15;
        else if (bodyLines.length > 5) fontSize = 17;

        const textObjects = bodyLines.map(text => ({
          text: text,
          options: { 
            bullet: true, 
            fontSize: fontSize, 
            color: '334155',
            paraSpaceBefore: 0.05,
            breakLine: true
          }
        }));

        slide.addText(textObjects, { 
          x: 0.5, y: 1.2, w: bodyW, h: 3.8,
          valign: 'top',
          align: 'left',
          autoFit: true
        });

        if (hasImage) {
          slide.addImage({ 
            data: imagesMap[idx], 
            x: 6.5, y: 1.2, w: 3.0, h: 3.5,
            sizing: { type: 'contain' }
          });
        }

        slide.addText("EduGen VN BY NGUYỄN ĐỨC THƯƠNG - Hệ sinh thái giáo dục số", {
          x: 0.0, y: 5.2, w: 10, h: 0.3,
          fontSize: 9, color: '94A3B8', align: 'center', italic: true
        });
      });
      
      await pres.writeFile({ fileName: `Slide_EduGen_${Date.now()}.pptx` });
    } catch (err) {
      console.error("Lỗi xuất file PPTX:", err);
      alert("Có lỗi xảy ra khi tạo file PPTX. Vui lòng thử lại.");
    } finally { 
      setIsExporting(false); 
    }
  };

  const markdownComponents = {
    text: ({ children }: any) => {
      if (typeof children !== 'string') return children;
      const parts = children.split(NLS_PATTERN);
      return parts.map((part, i) => {
        if (NLS_PATTERN.test(part)) {
          NLS_PATTERN.lastIndex = 0;
          return <span key={i} className="font-bold text-blue-600 underline-offset-4">{part}</span>;
        }
        return part;
      });
    }
  };

  const isWorking = isGenerating || isProcessingImages;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[750px] lg:h-[900px]">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPresentationMode ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 leading-none">Studio EduGen</span>
            {isWorking && (
              <span className="text-[9px] font-bold text-blue-600 animate-pulse mt-1 flex items-center gap-1 uppercase">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Đang xử lý dữ liệu...
              </span>
            )}
          </div>
        </div>
        <button
          onClick={isPresentationMode ? handleDownloadPptx : handleDownloadWord}
          disabled={isExporting || isWorking}
          className={`px-5 py-2 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
            isWorking ? 'animate-pulse opacity-80 cursor-wait' : ''
          } ${isPresentationMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isExporting ? (
             <>
               <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               ĐANG TẢI...
             </>
          ) : isGenerating ? (
             "ĐANG SOẠN VĂN BẢN..."
          ) : isProcessingImages ? (
             "ĐANG VẼ ẢNH AI..."
          ) : isPresentationMode ? (
             "TẢI SLIDE (PPTX)"
          ) : (
             "TẢI FILE WORD"
          )}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto bg-slate-50 p-6 custom-scrollbar">
        {isPresentationMode && slidesRawData.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl aspect-[16/9] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col p-8 relative">
              <h4 className="text-2xl font-bold text-blue-700 mb-6 border-b pb-4">
                {slidesRawData[currentSlideIndex].match(/### (.*)/)?.[1] || "Slide Content"}
              </h4>
              <div className="flex gap-8 flex-grow">
                <div className="flex-grow prose prose-slate">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {slidesRawData[currentSlideIndex].replace(/### .*\n/, '').replace(/\[IMAGE_PROMPT:.*?\]/g, '')}
                  </ReactMarkdown>
                </div>
                {imagesMap[currentSlideIndex] ? (
                  <div className="w-1/3 rounded-xl overflow-hidden shadow-md">
                    <img src={imagesMap[currentSlideIndex]} className="w-full h-full object-cover" alt="AI slide" />
                  </div>
                ) : imageErrorMap[currentSlideIndex] ? (
                  <div className="w-1/3 rounded-xl bg-red-50 flex flex-col items-center justify-center text-red-500 p-2 gap-2 border border-dashed border-red-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center">LỖI TẠO ẢNH</span>
                    <p className="text-[9px] text-red-500 text-center">{imageErrorMap[currentSlideIndex]}</p>
                  </div>
                ) : slidesRawData[currentSlideIndex].includes('[IMAGE_PROMPT:') ? (
                  <div className="w-1/3 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-300">
                    <svg className="animate-spin h-6 w-6 text-slate-300" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Đang vẽ ảnh...</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => setCurrentSlideIndex(p => Math.max(0, p - 1))} className="p-2 bg-white border rounded-lg shadow hover:bg-slate-50 transition-colors">◀</button>
              <span className="font-bold text-slate-500 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">{currentSlideIndex + 1} / {slidesRawData.length}</span>
              <button onClick={() => setCurrentSlideIndex(p => Math.min(slidesRawData.length - 1, p + 1))} className="p-2 bg-white border rounded-lg shadow hover:bg-slate-50 transition-colors">▶</button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white p-10 rounded-xl shadow border prose prose-slate">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content.replace(/\[IMAGE_PROMPT:.*?\]/g, '')}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
