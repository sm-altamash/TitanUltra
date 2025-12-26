import React from 'react';
import { Metrics, CircuitState } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Zap, ShieldAlert, CheckCircle2, Database, Coins, ArrowUp } from 'lucide-react';

interface MetricsDeckProps {
  metrics: Metrics;
  history: { time: string; rpm: number; latency: number }[];
}

export const MetricsDeck: React.FC<MetricsDeckProps> = ({ metrics, history }) => {
  const tokenCapacity = 20;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      
      {/* Active Threads & Pool */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs uppercase font-bold">Concurrency</span>
          <Activity size={16} className="text-cyan-400" />
        </div>
        <div className="text-2xl font-mono font-bold text-white">
            {metrics.activeAgents} <span className="text-sm text-slate-500 font-normal">/ {metrics.congestionTarget}</span>
        </div>
        <div className="text-xs text-cyan-400 mt-1">Adaptive Target</div>
      </div>

      {/* Success & DLQ */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs uppercase font-bold">Dead Letter Q</span>
          <Database size={16} className={metrics.dlqCount > 0 ? "text-red-500" : "text-slate-600"} />
        </div>
        <div className="text-2xl font-mono font-bold text-white">{metrics.dlqCount}</div>
        <div className="text-xs text-slate-500 mt-1">Permanent Failures</div>
      </div>

      {/* Token Bucket */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs uppercase font-bold">Rate Tokens</span>
          <Coins size={16} className="text-yellow-400" />
        </div>
        
        <div className="flex items-center gap-2 mt-1">
             <div className="text-2xl font-mono font-bold text-white">{metrics.tokenBalance}</div>
             <span className="text-xs text-slate-500 font-mono pt-2">/ {tokenCapacity}</span>
             
             {/* Animated Refill Indicator */}
             <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] animate-pulse">
                <ArrowUp size={10} className="animate-bounce" />
                <span>2/s</span>
             </div>
        </div>

        <div className="flex gap-0.5 mt-2 h-1.5 w-full">
          {Array.from({ length: tokenCapacity }).map((_, i) => (
             <div 
               key={i} 
               className={`flex-1 rounded-[1px] transition-all duration-300 ${i < metrics.tokenBalance ? 'bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.4)]' : 'bg-slate-800'}`} 
             />
          ))}
        </div>
        
        <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider flex justify-between">
             <span>Quota Status</span>
             <span>Burst: {tokenCapacity}</span>
        </div>
      </div>

      {/* Circuit Breaker */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg flex flex-col justify-between relative overflow-hidden">
        {metrics.circuitBreakerStatus === CircuitState.OPEN && (
           <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
        )}
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs uppercase font-bold">Circuit</span>
          <ShieldAlert size={16} className={metrics.circuitBreakerStatus === CircuitState.OPEN ? 'text-red-500' : 'text-emerald-400'} />
        </div>
        <div className={`text-xl font-mono font-bold ${metrics.circuitBreakerStatus === CircuitState.OPEN ? 'text-red-500' : 'text-emerald-400'}`}>
          {metrics.circuitBreakerStatus}
        </div>
        <div className="text-xs text-slate-500 mt-1">
            {metrics.circuitBreakerStatus === CircuitState.OPEN ? 'Traffic Halted' : 'Systems Nominal'}
        </div>
      </div>

      {/* Charts */}
      <div className="md:col-span-2 h-48 bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
        <h3 className="text-xs text-slate-400 uppercase font-bold mb-4">Throughput (RPM) vs Congestion</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorRpm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => val.toFixed(0)} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} 
              itemStyle={{ color: '#22d3ee' }}
            />
            <Area type="monotone" dataKey="rpm" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRpm)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="md:col-span-2 h-48 bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
        <h3 className="text-xs text-slate-400 uppercase font-bold mb-4">Latency (ms) [TCP Vegas]</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis stroke="#475569" fontSize={10} />
            <Tooltip
               cursor={{fill: '#1e293b'}}
               contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} 
            />
            <Bar dataKey="latency" fill="#eab308" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};