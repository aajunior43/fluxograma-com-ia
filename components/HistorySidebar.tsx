import React from 'react';
import { DiagramData } from '../types';
import { Trash2, Clock, Plus, X } from 'lucide-react';

interface HistorySidebarProps {
  history: DiagramData[];
  onSelect: (diagram: DiagramData) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNew: () => void;
  selectedId: string | null;
  isOpen: boolean;
  onCloseMobile: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  history, 
  onSelect, 
  onDelete, 
  onNew,
  selectedId,
  isOpen,
  onCloseMobile
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:relative z-40 h-full w-[280px] bg-neu-base flex flex-col shrink-0 transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:-translate-x-0 md:overflow-hidden'}
      `}>
        <div className="p-5 flex flex-col gap-4 h-full">
          <div className="flex justify-between items-center md:hidden mb-2">
            <span className="font-bold text-slate-600">Histórico</span>
            <button onClick={onCloseMobile} className="p-2 rounded-full shadow-neu-flat active:shadow-neu-pressed text-slate-500">
              <X size={18} />
            </button>
          </div>

          <button 
            onClick={() => { onNew(); onCloseMobile(); }}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-neu-flat active:translate-y-0.5 active:shadow-neu-pressed"
          >
            <Plus size={20} />
            Novo Diagrama
          </button>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full shadow-neu-pressed flex items-center justify-center mb-4">
                  <Clock size={24} className="opacity-50" />
                </div>
                <p className="text-sm font-medium">Sem histórico</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => { onSelect(item); onCloseMobile(); }}
                  className={`group relative p-4 rounded-2xl cursor-pointer transition-all ${
                    selectedId === item.id 
                      ? 'shadow-neu-pressed text-primary-600' 
                      : 'shadow-neu-flat hover:translate-y-[-2px] text-slate-600 bg-neu-base'
                  }`}
                >
                  <h4 className="font-bold text-sm truncate mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs opacity-70 truncate mb-2">
                    {item.explanation}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] opacity-50 font-mono">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={(e) => onDelete(item.id, e)}
                      className="p-2 text-red-400 hover:text-red-500 rounded-full hover:shadow-neu-pressed transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;