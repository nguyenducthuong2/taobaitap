
import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import pptxgen from "pptxgenjs";
import { 
  Document, 
  Packer, 
  Paragraph, 
  HeadingLevel,
  AlignmentType,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { ExamRequest, WorkMode } from '../types';

interface ExamDisplayProps {
  content: string;
  isPresentationMode?: boolean;
  isGenerating?: boolean;
  request: ExamRequest;
}

const THEMES: { [key: string]: { bg: string; title: string; text: string; highlight: string; slideBg: string; } } = {
  'Xanh Dương': { bg: 'bg-blue-50', title: 'text-blue-800', text: 'text-slate-700', highlight: 'text-blue-600', slideBg: 'bg-white' },
  'Xanh Lá': { bg: 'bg-green-50', title: 'text-green-800', text: 'text-slate-700', highlight: 'text-green-600', slideBg: 'bg-white' },
  'Cam': { bg: 'bg-orange-50', title: 'text-orange-800', text: 'text-slate-700', highlight: 'text-orange-600', slideBg: 'bg-white' },
  'Tím': { bg: 'bg-purple-50', title: 'text-purple-800', text: 'text-slate-700', highlight: 'text-purple-600', slideBg: 'bg-white' },
  'Default': { bg: 'bg-slate-50', title: 'text-blue-700', text: 'text-slate-800', highlight: 'text-blue-600', slideBg: 'bg-white' }
};

const PPTX_THEMES: { [key: string]: { slideBg: string; title: string; text: string; highlight: string; } } = {
  'Xanh Dương': { slideBg: 'F0F9FF', title: '1E40AF', text: '334155', highlight: '2563EB' },
  'Xanh Lá': { slideBg: 'F0FDF4', title: '166534', text: '334155', highlight: '16A34A' },
  'Cam': { slideBg: 'FFF7ED', title: '9A3412', text: '334155', highlight: 'EA580C' },
  'Tím': { slideBg: 'FBF5FF', title: '6B21A8', text: '334155', highlight: '9333EA' },
  'Default': { slideBg: 'F8FAFC', title: '1D4ED8', text: '334155', highlight: '2563EB' }
};

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ content, isPresentationMode, isGenerating, request }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [theme, setTheme] = useState('Xanh Dương');
  const [slidesContent, setSlidesContent] = useState('');

  useEffect(() => {
    if (isPresentationMode) {
      const themeMatch = content.match(/\[THEME:\s*([^\]]+)\]/);
      const currentTheme = themeMatch ? themeMatch[1].trim() : 'Xanh Dương';
      setTheme(currentTheme);
      const contentWithoutTheme = content.replace(/\[THEME:\s*([^\]]+)\]\s*/, '');
      setSlidesContent(contentWithoutTheme);
    } else {
      setSlidesContent(content);
    }
    setCurrentSlideIndex(0);
  }, [isPresentationMode, isGenerating, content]);
  
  const slidesRawData = useMemo(() => {
    if (!isPresentationMode) return [];
    return slidesContent.split(/---/).filter(s => s.trim().length > 5);
  }, [slidesContent, isPresentationMode]);

  const cleanSlideText = (text: string) => {
    if (!text) return "";
    return text.replace(/\$/g, '').trim();
  };
  
  const currentThemeColors = THEMES[theme] || THEMES['Default'];
  const pptxColors = PPTX_THEMES[theme] || PPTX_THEMES['Default'];

  type PptxTextObject = {
    text: string;
    options?: {
      bold?: boolean;
      color?: string;
      bullet?: boolean;
      breakLine?: boolean;
    };
  };

  const parseTextForPptx = (line: string, defaultColor: string, highlightColor: string): PptxTextObject[] => {
    const parts = cleanSlideText(line).split('**');
    const textObjects: PptxTextObject[] = [];
    parts.forEach((part, index) => {
      if (part) {
        textObjects.push({
          text: part,
          options: {
            bold: index % 2 !== 0,
            color: index % 2 !== 0 ? highlightColor : defaultColor,
          }
        });
      }
    });
    return textObjects;
  };

  const handleDownloadPptx = async () => {
    setIsExporting(true);
    try {
      const PptxGenConstructor = (pptxgen as any).default || pptxgen;
      const pres = new PptxGenConstructor();
      pres.layout = 'LAYOUT_16x9';

      slidesRawData.forEach((slideRaw) => {
        const slide = pres.addSlide();
        slide.background = { color: pptxColors.slideBg };

        const lines = slideRaw.trim().split('\n');
        let title = "BÀI GIẢNG";
        const bodyLines: string[] = [];
        
        lines.forEach(l => {
          const cleanLine = l.trim();
          if (cleanLine.startsWith('### ')) {
            title = cleanSlideText(cleanLine.replace(/### Slide \d+:/, ''));
          } else if (cleanLine) {
            bodyLines.push(cleanLine);
          }
        });

        slide.addText(parseTextForPptx(title, pptxColors.title, pptxColors.highlight), { 
          x: 0.5, y: 0.25, w: 9.0, h: 1.0, fontSize: 32, bold: true, color: pptxColors.title, align: 'center', valign: 'middle' 
        });
        
        const bodyObjects: PptxTextObject[] = bodyLines.flatMap(line => {
          const lineParts = parseTextForPptx(line, pptxColors.text, pptxColors.highlight);
          if (lineParts.length > 0) {
            lineParts[0].options = { ...lineParts[0].options, bullet: true };
            return [...lineParts, { text: '', options: { breakLine: true } }];
          }
          return [];
        });

        if (bodyObjects.length > 0 && bodyObjects[bodyObjects.length - 1].options?.breakLine) {
          bodyObjects.pop();
        }
        
        slide.addText(bodyObjects, { 
          x: 0.75, y: 1.5, w: 8.5, h: 3.5, valign: 'top', autoFit: true, fontSize: 18 
        });

        slide.addText("HỆ SINH THÁI GIÁO DỤC SỐ - EDUGEN VN", { x: 0, y: 5.2, w: 10, h: 0.3, fontSize: 10, color: '94A3B8', align: 'center' });
      });
      
      await pres.writeFile({ fileName: `EduGen_Slide_${Date.now()}.pptx` });
    } catch (err) {
      console.error(err);
    } finally { setIsExporting(false); }
  };

  const handleDownloadWord = async () => {
    setIsExporting(true);
    try {
        const docTitle = request.mode === WorkMode.lesson_plan
            ? "GIÁO ÁN PHÁT TRIỂN NĂNG LỰC SỐ (NLS)"
            : "BÀI TẬP VÀ LỜI GIẢI CHI TIẾT";

        const docChildren: (Paragraph | Table)[] = [
            new Paragraph({ text: docTitle, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER })
        ];

        const lines = content.split('\n');
        let inTable = false;
        let tableRows: TableRow[] = [];

        const createParagraphsFromLine = (line: string): Paragraph[] => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') {
                return [new Paragraph({ text: '' })];
            }
            const parts = trimmedLine.split(/(\$.*?\$)/g).filter(part => part);
            const children = parts.map(part => new TextRun({ text: part }));
            return [new Paragraph({ children, spacing: { before: 120 } })];
        };

        const createCell = (text: string, isHeader: boolean) => new TableCell({
            children: [new Paragraph({ text, alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT })],
            shading: isHeader ? { fill: 'EFEFEF' } : undefined,
        });

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                const cells = trimmedLine.split('|').slice(1, -1).map(cell => cell.trim());
                if (cells.every(cell => /^-+$/.test(cell.replace(/:/g, '')))) {
                    continue;
                }
                const isHeader = tableRows.length === 0;
                tableRows.push(new TableRow({
                    children: cells.map(cellText => createCell(cellText, isHeader)),
                    tableHeader: isHeader,
                }));
            } else {
                if (inTable) {
                    docChildren.push(new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows,
                    }));
                    inTable = false;
                    tableRows = [];
                }
                docChildren.push(...createParagraphsFromLine(line));
            }
        }

        if (inTable && tableRows.length > 0) {
            docChildren.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
            }));
        }

        const doc = new Document({
            sections: [{ children: docChildren }]
        });

        const blob = await Packer.toBlob(doc);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileName = request.mode === WorkMode.lesson_plan
            ? `GiaoAn_EduGen_${Date.now()}.docx`
            : `BaiTap_EduGen_${Date.now()}.docx`;
        link.download = fileName;
        link.click();
    } catch (err) {
        console.error(err);
    } finally {
        setIsExporting(false);
    }
  };

  const markdownComponents = {
    h3: ({...props}) => <h3 className={`text-2xl font-bold ${currentThemeColors.title} mb-4 border-b pb-3`} {...props} />,
    strong: ({...props}) => <strong className={`${currentThemeColors.highlight} font-bold`} {...props} />,
    p: ({...props}) => <p className={`${currentThemeColors.text}`} {...props} />,
    li: ({...props}) => <li className={`${currentThemeColors.text}`} {...props} />,
    text: ({ children }: any) => {
      if (typeof children !== 'string') return children;
      return children.replace(/\$/g, '');
    }
  };

  const currentSlide = slidesRawData.length > 0 ? slidesRawData[currentSlideIndex] : null;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[750px] lg:h-[900px]">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPresentationMode ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 leading-none">Studio EduGen</span>
          </div>
        </div>
        <button
          onClick={isPresentationMode ? handleDownloadPptx : handleDownloadWord}
          disabled={isExporting || isGenerating || (isPresentationMode && slidesRawData.length === 0)}
          className={`px-5 py-2 rounded-xl text-white font-bold text-sm shadow-md transition-all ${isPresentationMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-slate-300`}
        >
          {isExporting ? "ĐANG XUẤT..." : isPresentationMode ? "TẢI SLIDE (PPTX)" : "TẢI WORD"}
        </button>
      </div>

      <div className={`flex-grow overflow-y-auto p-6 custom-scrollbar transition-colors duration-300 ${isPresentationMode ? currentThemeColors.bg : 'bg-slate-50'}`}>
        {isPresentationMode && slidesRawData.length > 0 && currentSlide ? (
          <div className="flex flex-col items-center">
            <div className={`w-full max-w-4xl aspect-[16/9] rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col p-8 relative transition-colors duration-300 ${currentThemeColors.slideBg}`}>
                <div className="w-full flex-grow prose prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {currentSlide}
                  </ReactMarkdown>
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
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
