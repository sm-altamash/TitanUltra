import React, { useState } from 'react';
import { Agent, AgentStatus, LogEntry } from '../types';
import { Bot, User, Globe, FileText, Check, AlertCircle, Clock, Database, PauseCircle, RotateCcw, Ban, ScrollText, X, Terminal, RefreshCw } from 'lucide-react';

interface AgentGridProps {
  agents: Agent[];
  logs: LogEntry[];
  onRestart: (id: number) => void;
  onForceFail: (id: number) => void;
  onViewLogs: (id: number) => void;
}

export const AgentGrid: React.FC<AgentGridProps> = ({ agents, logs, onRestart, onForceFail, onViewLogs }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const getStatusStyles = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'bg-slate-800 border-slate-700 text-slate-400';
      case AgentStatus.INITIALIZING: return 'bg-blue-950/30 border-blue-800 text-blue-400 ring-1 ring-blue-500/20';
      case AgentStatus.NAVIGATING: return 'bg-cyan-950/30 border-cyan-800 text-cyan-400 ring-1 ring-cyan-500/20';
      case AgentStatus.ANALYZING: return 'bg-purple-950/30 border-purple-800 text-purple-400';
      case AgentStatus.FILLING: return 'bg-indigo-950/30 border-indigo-800 text-indigo-400';
      case AgentStatus.SUCCESS: return 'bg-emerald-950/30 border-emerald-800 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case AgentStatus.FAILED_RETRY: return 'bg-yellow-950/30 border-yellow-800 text-yellow-400 border-dashed';
      case AgentStatus.DEAD_LETTER: return 'bg-red-950/20 border-red-900 text-red-500 grayscale opacity-70';
      case AgentStatus.WAITING_FOR_POOL: return 'bg-slate-800 border-slate-700 text-slate-500 opacity-80';
      default: return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.INITIALIZING: return <Bot size={14} className="animate-bounce" />;
      case AgentStatus.NAVIGATING: return <Globe size={14} className="animate-spin-slow" />; // Custom spin
      case AgentStatus.ANALYZING: return <User size={14} />;
      case AgentStatus.FILLING: return <FileText size={14} />;
      case AgentStatus.SUCCESS: return <Check size={14} />;
      case AgentStatus.FAILED_RETRY: return <RefreshCw size={14} className="animate-spin" />;
      case AgentStatus.DEAD_LETTER: return <Database size={14} />;
      case AgentStatus.WAITING_FOR_POOL: return <PauseCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

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

  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  const agentLogs = selectedAgentId ? logs.filter(l => l.source === `AGENT_0${selectedAgentId}`) : [];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className={`p-3 rounded border ${getStatusStyles(agent.status)} transition-all duration-300 relative overflow-hidden group hover:shadow-lg`}
          >
            {/* Progress Bar Background */}
            {agent.status !== AgentStatus.IDLE && 
             agent.status !== AgentStatus.SUCCESS && 
             agent.status !== AgentStatus.DEAD_LETTER && 
             agent.status !== AgentStatus.WAITING_FOR_POOL && (
               <div 
                 className="absolute inset-0 bg-current opacity-[0.08] pointer-events-none transition-all duration-500 ease-out origin-left" 
                 style={{ transform: `scaleX(${agent.progress / 100})` }} 
               />
            )}

            {/* Action Overlay */}
            <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[2px] z-20">
               <button 
                 onClick={(e) => { e.stopPropagation(); onRestart(agent.id); }}
                 className="p-2 rounded-full bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 transition-all hover:scale-110"
                 title="Restart Agent"
               >
                 <RotateCcw size={18} />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onForceFail(agent.id); }}
                 className="p-2 rounded-full bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 transition-all hover:scale-110"
                 title="Force Fail"
               >
                 <Ban size={18} />
               </button>
               <button 
                 onClick={(e) => { 
                    e.stopPropagation(); 
                    onViewLogs(agent.id);
                    setSelectedAgentId(agent.id);
                 }}
                 className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-all hover:scale-110"
                 title="View Logs"
               >
                 <ScrollText size={18} />
               </button>
            </div>

            <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="font-mono text-xs font-bold">AGENT_0{agent.id}</span>
              {getStatusIcon(agent.status)}
            </div>
            
            <div className="space-y-1 relative z-10">
               <div className="text-xs opacity-70 truncate font-mono">
                  {agent.status === AgentStatus.DEAD_LETTER ? 'TERMINATED' : (agent.identity || 'UNASSIGNED')}
               </div>
               <div className="text-[10px] uppercase tracking-wider opacity-60 flex justify-between items-center h-4">
                  <span className="truncate max-w-[60%]">{agent.currentTask}</span>
                  {agent.attempt > 1 && agent.status !== AgentStatus.SUCCESS && agent.status !== AgentStatus.DEAD_LETTER && (
                      <span className="text-yellow-500 font-bold bg-yellow-950/50 px-1 rounded animate-pulse">TRY:{agent.attempt}</span>
                  )}
               </div>
            </div>
          </div>
        ))}
        
        {agents.length === 0 && (
           <div className="col-span-full py-8 text-center text-slate-600 italic border border-dashed border-slate-800 rounded bg-slate-900/20">
              No agents deployed. Initialize swarm to begin.
           </div>
        )}
      </div>

      {/* Agent Logs Modal */}
      {selectedAgent && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setSelectedAgentId(null)}
        >
            <div 
                className="bg-slate-950 border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200" 
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded border border-slate-700">
                           <Terminal size={18} className="text-cyan-400" />
                        </div>
                        <div>
                           <h3 className="font-bold text-white text-sm flex items-center gap-2">
                              NODE INSPECTOR: AGENT_0{selectedAgent.id}
                           </h3>
                           <p className="text-xs font-mono text-slate-400">{selectedAgent.identity || 'IDENTITY_PENDING'}</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => setSelectedAgentId(null)} 
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                     >
                        <X size={20} />
                     </button>
                </div>

                {/* Log Content */}
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 bg-slate-950 terminal-scroll">
                    {agentLogs.length === 0 ? (
                        <div className="text-slate-600 italic text-center py-12 flex flex-col items-center gap-2">
                           <Bot size={32} className="opacity-20" />
                           <span>No specific telemetry found for this unit.</span>
                        </div>
                    ) : (
                        agentLogs.map((log) => (
                            <div key={log.id} className="flex gap-3 hover:bg-slate-900/50 p-1 rounded -mx-1">
                                <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                                <span className={`font-bold shrink-0 w-16 ${getLevelColor(log.level)}`}>{log.level}</span>
                                <span className="text-slate-300 break-all">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-3 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-400 flex justify-between items-center font-mono">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-2">
                            STATUS: <span className="text-white">{selectedAgent.status}</span>
                        </span>
                        <span className="flex items-center gap-2">
                            TASK: <span className="text-white">{selectedAgent.currentTask}</span>
                        </span>
                    </div>
                    <div>
                       REC: {agentLogs.length}
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};