import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, EyeOff, ShieldCheck } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-blue-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-500';
      case 'SUCCESS': return 'text-emerald-400';
      case 'DEBUG': return 'text-slate-500';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
        <TerminalIcon size={16} className="text-slate-400" />
        <span className="text-xs font-mono font-bold text-slate-400">SYSTEM_LOG // TTY1</span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs terminal-scroll space-y-1">
        {logs.length === 0 && <div className="text-slate-600 italic">Waiting for orchestration...</div>}
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`flex gap-3 py-1 px-2 -mx-2 rounded transition-colors border-l-2 ${
              log.isStealth 
                ? 'bg-cyan-950/30 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.05)]' 
                : 'border-transparent hover:bg-slate-900/30'
            }`}
          >
            {log.isStealth ? (
              <EyeOff size={12} className="text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <span className="w-3 shrink-0" /> /* Spacer if no icon */
            )}
            <span className="text-slate-600 shrink-0 opacity-70">[{log.timestamp}]</span>
            <span className={`font-bold shrink-0 w-16 ${getLevelColor(log.level)}`}>{log.level}</span>
            <span className="text-slate-500 shrink-0 w-24 hidden md:block opacity-60">[{log.source}]</span>
            <span className={`${log.isStealth ? 'text-cyan-200 font-semibold' : 'text-slate-300'} break-all`}>{log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};