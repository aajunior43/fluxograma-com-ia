import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MermaidRendererProps {
  code: string;
  onDownload?: (svg: string) => void;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, onDownload }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        background: '#e0e5ec',
        primaryColor: '#e0e5ec',
        primaryTextColor: '#4d5561',
        primaryBorderColor: '#a3b1c6',
        lineColor: '#6d5dfc',
        secondaryColor: '#e0e5ec',
        tertiaryColor: '#e0e5ec',
      },
      fontFamily: 'Nunito, sans-serif',
      flowchart: {
        htmlLabels: false, // Critical for PDF export: prevents foreignObject use which taints canvas
      },
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      setError(null);
      
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
        if (onDownload) onDownload(svg);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        setError("Erro na sintaxe do diagrama.");
      }
    };

    if (code) {
      renderDiagram();
    }
  }, [code, onDownload]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse Events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Events for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
      // Prevent scrolling page while dragging diagram
      e.preventDefault();
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-8 text-center">
        <AlertCircle size={48} className="mb-4 opacity-80" />
        <h3 className="text-lg font-bold">Ops! Algo deu errado.</h3>
        <p className="text-sm opacity-70 mt-2">A IA gerou um código inválido. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col rounded-2xl">
       {/* Toolbar - Floating Pills */}
       <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-3">
        <button onClick={handleZoomIn} className="p-3 bg-neu-base rounded-full shadow-neu-flat active:shadow-neu-pressed text-slate-600 transition-all" title="Zoom In">
          <ZoomIn size={20} />
        </button>
        <button onClick={handleZoomOut} className="p-3 bg-neu-base rounded-full shadow-neu-flat active:shadow-neu-pressed text-slate-600 transition-all" title="Zoom Out">
          <ZoomOut size={20} />
        </button>
        <button onClick={handleReset} className="p-3 bg-neu-base rounded-full shadow-neu-flat active:shadow-neu-pressed text-slate-600 transition-all" title="Reset">
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Render Area */}
      <div 
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        ref={containerRef}
      >
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out origin-center"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }} 
        />
      </div>
    </div>
  );
};

export default MermaidRenderer;