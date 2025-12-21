
import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  const [queueStatus, setQueueStatus] = useState<string>("");
  
  const processingRef = useRef<boolean>(false);

  const slidesRawData = useMemo(() => {
    if (!isPresentationMode) return [];
    return content.split(/---/).filter(s => s.trim().length > 5);
  }, [content, isPresentationMode]);

  const cleanSlideText = (text: string) => {
    if (!text) return "";
    return text.replace(/\$/g, '').trim();
  };

  const processImageQueue = async () => {
    if (processingRef.current || isGenerating || slidesRawData.length === 0) return;
    
    const indicesToProcess = slidesRawData
      .map((s, idx) => ({ idx, text: s }))
      .filter(s => s.text.includes('[IMAGE_PROMPT:'))
      .map(s => s.idx)
      .filter(idx => !imagesMap[idx] && !imageErrorMap[idx]?.includes("vĩnh viễn"));

    if (indicesToProcess.length === 0) {
      setQueueStatus("");
      return;
    }

    processingRef.current = true;
    setIsProcessingImages(true);

    const sortedQueue = [...indicesToProcess].sort((a, b) => {
      if (a === currentSlideIndex) return -1;
      if (b === currentSlideIndex) return 1;
      return a - b;
    });

    for (let i = 0; i < sortedQueue.length; i++) {
      const idx = sortedQueue[i];
      const slideText = slidesRawData[idx];
      const match = slideText.match(/\[IMAGE_PROMPT:\s*(.*?)\]/);
      
      if (match && match[1]) {
        setQueueStatus(`Đang vẽ ảnh slide ${idx + 1}...`);
        
        let success = false;
        let attempts = 0;

        while (!success && attempts < 2) {
          try {
            setImageErrorMap(prev => {
              const next = { ...prev };
              delete next[idx];
              return next;
            });

            const imgData = await generateImageFromAI(match[1]);
            setImagesMap(prev => ({ ...prev, [idx]: imgData }));
            success = true;
          } catch (err: any) {
            attempts++;
            const isQuota = err.message?.includes("429") || err.message?.toLowerCase().includes("quota");
            
            if (isQuota) {
              setQueueStatus(`Hạn ngạch đầy. Đợi 60s để thử lại...`);
              await new Promise(r => setTimeout(r, 60000));
            } else {
              setImageErrorMap(prev => ({ ...prev, [idx]: "Lỗi vẽ ảnh (vĩnh viễn)" }));
              break; 
            }
          }
        }

        if (success && i < sortedQueue.length - 1) {
          let timer = 60;
          while (timer > 0) {
            setQueueStatus(`Tuân thủ giới hạn miễn phí. Chờ ${timer}s...`);
            await new Promise(r => setTimeout(r, 1000));
            timer--;
          }
        }
      }
    }

    setIsProcessingImages(false);
    processingRef.current = false;
    setQueueStatus(indicesToProcess.length > 0 ? "Hoàn tất hàng đợi ảnh!" : "");
  };

  useEffect(() => {
    setCurrentSlideIndex(0);
    setImagesMap({});
    setImageErrorMap({});
    if (isPresentationMode && !isGenerating && slidesRawData.length > 0) {
      // Dùng timeout nhỏ để đảm bảo slidesRawData đã ổn định
      setTimeout(() => processImageQueue(), 100);
    }
  }, [isPresentationMode, isGenerating, content]);

  const handleRetry = (idx: number) => {
    setImageErrorMap(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    if (!processingRef.current) {
      // Dùng timeout để state kịp cập nhật trước khi chạy queue
      setTimeout(() => processImageQueue(), 100);
    }
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
        let title = "BÀI GIẢNG";
        let bodyLines: string[] = [];
        
        lines.forEach(l => {
          const cleanLine = l.trim();
          if (cleanLine.startsWith('### ')) {
            title = cleanSlideText(cleanLine.replace('### ', ''));
          } else if (cleanLine && !cleanLine.includes('[IMAGE_PROMPT')) {
            bodyLines.push(cleanSlideText(cleanLine));
          }
        });

        slide.background = { fill: "F8FAFC" };
        slide.addText(title.toUpperCase(), { 
          x: 0.5, y: 0.2, w: 9.0, h: 0.8, fontSize: 22, bold: true, color: '1E3A8A', align: 'center', valign: 'middle' 
        });

        const hasImg = !!imagesMap[idx];
        const contentW = hasImg ? 5.8 : 9.0;
        
        slide.addText(bodyLines.map(t => ({ text: t, options: { bullet: true, fontSize: 15, color: '334155', breakLine: true } })), { 
          x: 0.5, y: 1.2, w: contentW, h: 3.8, valign: 'top', autoFit: true 
        });

        if (hasImg) {
          slide.addImage({ data: imagesMap[idx], x: 6.5, y: 1.2, w: 3.0, h: 3.5, sizing: { type: 'contain' } });
        }

        slide.addText("HỆ SINH THÁI GIÁO DỤC SỐ - EDUGEN VN", { x: 0, y: 5.2, w: 10, h: 0.3, fontSize: 8, color: '94A3B8', align: 'center' });
      });
      
      await pres.writeFile({ fileName: `EduGen_Slide_${Date.now()}.pptx` });
    } catch (err) {
      console.error(err);
    } finally { setIsExporting(false); }
  };

  const handleDownloadWord = async () => {
    setIsExporting(true);
    try {
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: "GIÁO ÁN PHÁT TRIỂN NĂNG LỰC SỐ (NLS)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            ...content.split('\n').filter(l => !l.includes('[IMAGE_PROMPT')).map(l => new Paragraph({ text: l.replace(/\$/g, '').trim(), spacing: { before: 120 } }))
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `GiaoAn_EduGen_${Date.now()}.docx`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally { setIsExporting(false); }
  };

  const markdownComponents = {
    text: ({ children }: any) => {
      if (typeof children !== 'string') return children;
      return children.replace(/\$/g, '');
    }
  };

  const currentSlide = slidesRawData.length > 0 ? slidesRawData[currentSlideIndex] : null;
  const hasImageTag = currentSlide?.includes('[IMAGE_PROMPT:');

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[750px] lg:h-[900px]">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPresentationMode ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 leading-none">Studio EduGen</span>
            {queueStatus && (
              <span className="text-[10px] font-bold text-orange-600 animate-pulse mt-1 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                {queueStatus}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={isPresentationMode ? handleDownloadPptx : handleDownloadWord}
          disabled={isExporting || isGenerating}
          className={`px-5 py-2 rounded-xl text-white font-bold text-sm shadow-md transition-all ${isPresentationMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-slate-300`}
        >
          {isExporting ? "ĐANG XUẤT..." : isPresentationMode ? "TẢI SLIDE (PPTX)" : "TẢI WORD"}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto bg-slate-50 p-6 custom-scrollbar">
        {isPresentationMode && slidesRawData.length > 0 && currentSlide ? (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl aspect-[16/9] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col p-8 relative">
              <h4 className="text-2xl font-bold text-blue-700 mb-6 border-b pb-4">
                {cleanSlideText(currentSlide.match(/### (.*)/)?.[1] || "Bài giảng")}
              </h4>
              <div className="flex gap-8 flex-grow">
                <div className={`${hasImageTag || imagesMap[currentSlideIndex] ? 'w-2/3' : 'w-full'} flex-grow prose prose-slate`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {currentSlide.replace(/### .*\n/, '').replace(/\[IMAGE_PROMPT:.*?\]/g, '')}
                  </ReactMarkdown>
                </div>
                
                {imagesMap[currentSlideIndex] ? (
                  <div className="w-1/3 rounded-xl overflow-hidden shadow-md bg-slate-50">
                    <img src={imagesMap[currentSlideIndex]} className="w-full h-full object-cover" alt="AI slide" />
                  </div>
                ) : imageErrorMap[currentSlideIndex] ? (
                  <div className="w-1/3 rounded-xl bg-red-50 flex flex-col items-center justify-center text-red-500 p-4 border border-dashed border-red-200">
                    <p className="text-[9px] font-bold text-center uppercase mb-2">{imageErrorMap[currentSlideIndex]}</p>
                    <button onClick={() => handleRetry(currentSlideIndex)} className="text-[9px] underline font-bold">Thử lại</button>
                  </div>
                ) : hasImageTag ? (
                  <div className="w-1/3 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-300">
                    <svg className="animate-spin h-6 w-6 text-slate-300" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span className="text-[10px] font-bold uppercase">Đang xếp hàng vẽ...</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => setCurrentSlideIndex(p => Math.max(0, p - 1))} disabled={currentSlideIndex === 0} className="p-2 bg-white border rounded-lg shadow hover:bg-slate-50 disabled:opacity-50">◀</button>
              <span className="font-bold text-slate-500 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">{currentSlideIndex + 1} / {slidesRawData.length}</span>
              <button onClick={() => setCurrentSlideIndex(p => Math.min(slidesRawData.length - 1, p + 1))} disabled={currentSlideIndex === slidesRawData.length - 1} className="p-2 bg-white border rounded-lg shadow hover:bg-slate-50 disabled:opacity-50">▶</button>
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
