import React, { useState, useEffect } from 'react';
import { 
  Menu, Sparkles, Send, Download, Code, Eye, 
  Share2, LayoutGrid, AlertCircle, ChevronLeft, FileText 
} from 'lucide-react';
import { generateDiagram } from './services/geminiService';
import MermaidRenderer from './components/MermaidRenderer';
import HistorySidebar from './components/HistorySidebar';
import { DiagramData, ViewMode } from './types';
import { jsPDF } from "jspdf";

function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DiagramData[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<DiagramData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default on mobile
  const [error, setError] = useState<string | null>(null);
  const [currentSvg, setCurrentSvg] = useState<string>('');

  // Initial responsiveness check
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('flowgen_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('flowgen_history', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateDiagram(prompt);
      
      const newDiagram: DiagramData = {
        id: crypto.randomUUID(),
        title: result.title,
        mermaidCode: result.mermaidCode,
        explanation: result.explanation,
        createdAt: Date.now()
      };
      
      setHistory(prev => [newDiagram, ...prev]);
      setCurrentDiagram(newDiagram);
      setPrompt('');
      
      // On mobile, ensure we see the result
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } catch (err) {
      setError("Não foi possível gerar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentSvg) return;
    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDiagram?.title || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!currentSvg || !currentDiagram) return;

    // 1. Parse the SVG to get dimensions and aspect ratio
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(currentSvg, "image/svg+xml");
    const svgElement = svgDoc.documentElement;

    // Get the bounding box or viewbox
    let originalWidth = 0;
    let originalHeight = 0;
    const viewBox = svgElement.getAttribute('viewBox');

    if (viewBox) {
      const [, , w, h] = viewBox.split(' ').map(Number);
      originalWidth = w;
      originalHeight = h;
    } else {
      // Fallback: try to parse width/height attributes
      originalWidth = parseFloat(svgElement.getAttribute('width') || '1000');
      originalHeight = parseFloat(svgElement.getAttribute('height') || '1000');
    }

    // 2. Set a high resolution target (e.g., 3000px width)
    const targetWidth = 3000;
    const scaleFactor = targetWidth / originalWidth;
    const targetHeight = originalHeight * scaleFactor;

    // 3. Force these dimensions on the SVG element
    // This forces the browser to rasterize the vector at this size when loading into an Image
    svgElement.setAttribute('width', `${targetWidth}px`);
    svgElement.setAttribute('height', `${targetHeight}px`);

    // Serialize back to string
    const serializer = new XMLSerializer();
    let highResSvg = serializer.serializeToString(svgElement);

    // Ensure XML declaration
    if (!highResSvg.startsWith('<?xml')) {
      highResSvg = '<?xml version="1.0" standalone="no"?>\r\n' + highResSvg;
    }

    const img = new Image();
    const base64Svg = btoa(unescape(encodeURIComponent(highResSvg)));
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate orientation based on image dimensions
        const orientation = canvas.width > canvas.height ? 'l' : 'p';
        
        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const widthRatio = pageWidth / canvas.width;
        const heightRatio = pageHeight / canvas.height;
        const ratio = Math.min(widthRatio, heightRatio);

        const canvasWidth = canvas.width * ratio;
        const canvasHeight = canvas.height * ratio;

        const marginX = (pageWidth - canvasWidth) / 2;
        const marginY = (pageHeight - canvasHeight) / 2;

        pdf.addImage(imgData, 'PNG', marginX, marginY, canvasWidth, canvasHeight);
        pdf.save(`${currentDiagram.title}.pdf`);
      } catch (err) {
        console.error("PDF Export Error:", err);
        alert("Erro ao exportar PDF. Tente baixar como SVG.");
      }
    };

    img.onerror = (e) => {
      console.error("Error loading SVG for PDF:", e);
      alert("Erro ao preparar imagem para PDF.");
    };

    img.src = dataUrl;
  };

  const handleCopyCode = () => {
    if (currentDiagram) {
      navigator.clipboard.writeText(currentDiagram.mermaidCode);
      alert('Código copiado!');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(d => d.id !== id));
    if (currentDiagram?.id === id) {
      setCurrentDiagram(null);
    }
  };

  const examplePrompts = [
    "Fluxograma de login",
    "Sequência de pedido online",
    "Mapa mental de IA",
    "Classes de sistema escolar"
  ];

  return (
    <div className="flex h-screen w-full bg-neu-base text-slate-600 font-sans overflow-hidden selection:bg-primary-500 selection:text-white">
      
      <HistorySidebar 
        isOpen={isSidebarOpen}
        history={history}
        selectedId={currentDiagram?.id || null}
        onSelect={setCurrentDiagram}
        onDelete={handleDelete}
        onNew={() => setCurrentDiagram(null)}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        
        {/* Header - Neomorphic */}
        <header className="h-20 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 rounded-full shadow-neu-flat active:shadow-neu-pressed text-primary-600 transition-all hover:scale-105 active:scale-95"
            >
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2 text-primary-600">
              <Sparkles size={22} className="fill-current opacity-80" />
              <h1 className="text-xl font-extrabold tracking-tight text-slate-700 hidden sm:block">FlowGen AI</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {currentDiagram && (
              <>
                 <div className="hidden md:flex p-1 rounded-xl shadow-neu-pressed items-center">
                  <button 
                    onClick={() => setViewMode(ViewMode.PREVIEW)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      viewMode === ViewMode.PREVIEW 
                      ? 'shadow-neu-flat text-primary-600 bg-neu-base' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Eye size={16} />
                    <span className="hidden lg:inline">Visualizar</span>
                  </button>
                  <button 
                    onClick={() => setViewMode(ViewMode.CODE)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      viewMode === ViewMode.CODE 
                      ? 'shadow-neu-flat text-primary-600 bg-neu-base' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Code size={16} />
                    <span className="hidden lg:inline">Código</span>
                  </button>
                </div>

                <button 
                  onClick={handleCopyCode}
                  className="p-3 rounded-full shadow-neu-flat hover:text-primary-600 active:shadow-neu-pressed transition-all"
                  title="Copiar código"
                >
                  <Share2 size={18} />
                </button>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadPDF}
                    className="p-3 md:px-4 md:py-2 rounded-full md:rounded-xl shadow-neu-flat text-red-500 font-bold text-sm active:shadow-neu-pressed transition-all flex items-center gap-2"
                    title="Baixar PDF"
                  >
                    <FileText size={18} />
                    <span className="hidden md:inline">PDF</span>
                  </button>

                  <button 
                    onClick={handleDownload}
                    className="p-3 md:px-4 md:py-2 rounded-full md:rounded-xl shadow-neu-flat text-primary-600 font-bold text-sm active:shadow-neu-pressed transition-all flex items-center gap-2"
                    title="Baixar SVG"
                  >
                    <Download size={18} />
                    <span className="hidden md:inline">SVG</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col p-4 md:p-6 pt-0">
          
          {/* Main Display Area */}
          <div className="flex-1 rounded-3xl overflow-hidden flex flex-col mb-4 relative z-10">
            {currentDiagram ? (
               <div className="flex flex-col h-full">
                 <div className="px-2 mb-4 flex justify-between items-end">
                    <div>
                      <h2 className="font-bold text-xl text-slate-700 leading-tight">{currentDiagram.title}</h2>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{currentDiagram.explanation}</p>
                    </div>
                 </div>
                 
                 <div className="flex-1 overflow-hidden relative rounded-3xl shadow-neu-pressed bg-neu-base p-2">
                   {viewMode === ViewMode.PREVIEW ? (
                     <MermaidRenderer 
                        code={currentDiagram.mermaidCode} 
                        onDownload={(svg) => setCurrentSvg(svg)}
                     />
                   ) : (
                     <div className="w-full h-full overflow-auto p-4 custom-scrollbar">
                        <textarea 
                          className="w-full h-full bg-transparent text-slate-600 font-mono text-sm resize-none focus:outline-none"
                          value={currentDiagram.mermaidCode}
                          readOnly
                        />
                     </div>
                   )}
                 </div>
               </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto p-4">
                <div className="w-24 h-24 rounded-full shadow-neu-flat flex items-center justify-center mb-8 text-primary-500">
                  <LayoutGrid size={40} />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-700 mb-4">
                  Crie Fluxos <span className="text-primary-500">Mágicos</span>
                </h2>
                <p className="text-slate-500 mb-10 leading-relaxed">
                  Digite sua ideia e nossa IA desenhará o diagrama perfeito para você em segundos.
                </p>
                
                <div className="grid grid-cols-1 gap-4 w-full">
                  {examplePrompts.map((p, i) => (
                    <button 
                      key={i}
                      onClick={() => setPrompt(p)}
                      className="p-4 rounded-xl text-left text-sm font-medium text-slate-600 transition-all shadow-neu-flat hover:scale-[1.02] active:shadow-neu-pressed active:scale-95"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area - Floating Neomorphic */}
          <div className="shrink-0 pt-2 pb-2 md:pb-0 z-20">
            <div className="max-w-3xl mx-auto flex gap-4 items-end bg-neu-base p-2 rounded-2xl md:bg-transparent">
              <div className="flex-1 relative rounded-2xl shadow-neu-pressed bg-neu-base overflow-hidden">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva seu diagrama..."
                  className="w-full bg-transparent border-none py-4 px-5 pr-12 focus:ring-0 text-slate-700 placeholder:text-slate-400 resize-none h-[60px] max-h-[120px]"
                  style={{ minHeight: '60px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
                <div className="absolute right-4 bottom-4 text-[10px] text-slate-400 font-bold">
                   {prompt.length}/500
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className={`h-[60px] w-[60px] rounded-2xl flex items-center justify-center transition-all shadow-neu-flat active:shadow-neu-pressed active:scale-95 ${
                  loading || !prompt.trim()
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-primary-600'
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                ) : (
                  <Send size={24} className={prompt.trim() ? 'fill-primary-600' : ''} />
                )}
              </button>
            </div>
            {error && (
              <div className="max-w-3xl mx-auto mt-3 flex items-center gap-2 text-red-400 text-xs font-bold justify-center px-4 text-center">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default App;