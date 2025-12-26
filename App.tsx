import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Agent, AgentStatus, LogEntry, Metrics, SwarmConfig, CircuitState } from './types';
import { Terminal } from './components/Terminal';
import { MetricsDeck } from './components/MetricsDeck';
import { AgentGrid } from './components/AgentGrid';
import { generateIdentity } from './services/identityFactory';
import { generateAgentThought, analyzeTarget, generateSpeech } from './services/geminiService';
import { TokenBucket, CircuitBreaker, CongestionController, humanizer } from './services/backendCore';
import { Play, Square, Search, Shield, Server, Database, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';

const MAX_LOGS = 100;

// Initialize Backend Systems
const tokenBucket = new TokenBucket(20, 2); // Cap 20, 2/sec refill
const circuitBreaker = new CircuitBreaker();
const congestionControl = new CongestionController();

export default function App() {
  // --- State ---
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<SwarmConfig>({
    targetUrl: 'https://api.target-entity.com/v2/login',
    concurrency: 4,
    stealthMode: true,
    rateLimitTokens: 20,
    refillRate: 2,
    audioEnabled: false
  });
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    activeAgents: 0,
    completedMissions: 0,
    failedMissions: 0,
    dlqCount: 0,
    rpm: 0,
    avgLatency: 0,
    circuitBreakerStatus: CircuitState.CLOSED,
    tokenBalance: 20,
    poolSize: 0,
    congestionTarget: 4
  });
  
  const [history, setHistory] = useState<{ time: string; rpm: number; latency: number }[]>([]);
  const [analysis, setAnalysis] = useState<string>("");

  // Refs
  const agentsRef = useRef<Agent[]>([]);
  const metricsRef = useRef<Metrics>(metrics);
  const isRunningRef = useRef(isRunning);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambienceNodesRef = useRef<any[]>([]); // Store oscillators/gain nodes
  const audioQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // --- Audio Engine ---
  const initAudio = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  // Cinematic Dark Ambience
  const toggleDrone = (shouldPlay: boolean) => {
    const ctx = audioContextRef.current;
    
    // Cleanup existing
    if (!shouldPlay || !config.audioEnabled) {
        ambienceNodesRef.current.forEach(node => {
            try { 
                if (node.stop) node.stop(); 
                node.disconnect(); 
            } catch(e){}
        });
        ambienceNodesRef.current = [];
        return;
    }

    // Start Ambience if not already playing
    if (shouldPlay && ctx && ambienceNodesRef.current.length === 0) {
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2); // Fade in
        masterGain.connect(ctx.destination);

        // 1. Deep Bass Drone (Sawtooth)
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(35, ctx.currentTime); // Very low G#
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(120, ctx.currentTime);
        bassOsc.connect(bassFilter).connect(masterGain);

        // 2. Unsettling Dissonance (Sine, Detuned)
        const disOsc = ctx.createOscillator();
        disOsc.type = 'sine';
        disOsc.frequency.setValueAtTime(36.5, ctx.currentTime); // Binaural beat range
        const disGain = ctx.createGain();
        disGain.gain.value = 0.5;
        disOsc.connect(disGain).connect(masterGain);

        // 3. High Ethereal Whine (Triangle)
        const highOsc = ctx.createOscillator();
        highOsc.type = 'triangle';
        highOsc.frequency.setValueAtTime(800, ctx.currentTime);
        const highGain = ctx.createGain();
        highGain.gain.value = 0.02; // Very quiet
        
        // LFO for the High Whine (Breathing effect)
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.1; // Slow cycle
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.01;
        lfo.connect(lfoGain).connect(highGain.gain);

        highOsc.connect(highGain).connect(masterGain);

        bassOsc.start();
        disOsc.start();
        highOsc.start();
        lfo.start();

        ambienceNodesRef.current = [bassOsc, disOsc, highOsc, lfo, masterGain, bassFilter, disGain, highGain, lfoGain];
    }
  };

  useEffect(() => {
    toggleDrone(isRunning && config.audioEnabled);
  }, [isRunning, config.audioEnabled]);

  const processAudioQueue = async () => {
    if (isSpeakingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current || !config.audioEnabled) return;

    isSpeakingRef.current = true;
    const text = audioQueueRef.current.shift();
    
    if (text) {
        const buffer = await generateSpeech(text, audioContextRef.current);
        if (buffer && audioContextRef.current) {
            const ctx = audioContextRef.current;
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            // --- Alien Voice FX Chain ---
            
            // 1. Main Volume
            const voiceGain = ctx.createGain();
            voiceGain.gain.value = 1.2; 
            
            // 2. Metallic Delay (Robotic Slapback)
            const delay = ctx.createDelay();
            delay.delayTime.value = 0.04; // 40ms tight delay
            
            const feedback = ctx.createGain();
            feedback.gain.value = 0.3; // Low feedback

            // 3. Highpass Filter (Thinning the voice slightly for clarity/radio effect)
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 150;

            // Connections
            // Source -> Filter -> VoiceGain -> Destination (Dry)
            // Source -> Filter -> Delay -> Feedback -> Delay -> VoiceGain (Wet)
            
            source.connect(filter);
            filter.connect(voiceGain);
            filter.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(voiceGain);

            voiceGain.connect(ctx.destination);
            
            source.start();
            source.onended = () => {
                isSpeakingRef.current = false;
                processAudioQueue(); // Trigger next
            };
        } else {
            isSpeakingRef.current = false;
        }
    } else {
        isSpeakingRef.current = false;
    }
  };

  // Check audio queue periodically
  useEffect(() => {
    const interval = setInterval(processAudioQueue, 500);
    return () => clearInterval(interval);
  }, [config.audioEnabled]);


  // --- Helper Functions ---
  const addLog = useCallback((message: string, level: LogEntry['level'] = 'INFO', source: string = 'SYS', isStealth: boolean = false) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' }),
      level,
      source,
      message,
      isStealth
    };
    setLogs(prev => [...prev.slice(-MAX_LOGS), entry]);
  }, []);

  const initializeAgents = () => {
    const newAgents: Agent[] = Array.from({ length: config.concurrency }, (_, i) => ({
      id: i + 1,
      status: AgentStatus.IDLE,
      currentTask: 'AWAITING_DISPATCH',
      identity: '',
      progress: 0,
      attempt: 0,
      maxRetries: 3,
      logs: []
    }));
    setAgents(newAgents);
    addLog(`Swarm Engine Online. Pool Capacity: ${config.concurrency}`, 'INFO', 'ORCHESTRATOR');
  };

  const handleStart = async () => {
    if (!config.targetUrl) return;
    
    // Init Audio Context on user interaction
    initAudio();

    // Reset Backend Systems to ensure fresh state
    tokenBucket.reset();
    circuitBreaker.reset();
    
    setIsRunning(true);
    initializeAgents();
    
    addLog(`INITIALIZING TITAN ULTRA PROTOCOLS`, 'WARN', 'CORE');
    addLog(`Target: ${config.targetUrl}`, 'INFO', 'CONFIG');
    if (config.stealthMode) {
      addLog(`Stealth Mode ENGAGED. Fingerprint spoofing active.`, 'INFO', 'STEALTH');
    }
    
    // AI Analysis
    const analysisText = await analyzeTarget(config.targetUrl);
    setAnalysis(analysisText);
    addLog(`AI Reconnaissance: ${analysisText}`, 'INFO', 'GEMINI');
    
    // Speak Analysis if enabled
    if (config.audioEnabled) {
        audioQueueRef.current.push(`System initialized. Target acquired. Analyzing defense parameters: ${analysisText}`);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    addLog('Manual Override. Shutting down all worker threads.', 'WARN', 'USER');
    setAgents(prev => prev.map(a => ({ 
      ...a, 
      status: a.status === AgentStatus.DEAD_LETTER ? AgentStatus.DEAD_LETTER : AgentStatus.IDLE, 
      currentTask: 'HALTED', 
      progress: 0 
    })));
  };

  // --- Manual Agent Controls ---
  const handleRestartAgent = (id: number) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        addLog(`Manual Override: Rebooting AGENT_0${id}`, 'WARN', 'USER_OP');
        return {
          ...agent,
          status: AgentStatus.IDLE,
          currentTask: 'MANUAL_REBOOT',
          progress: 0,
          attempt: 0,
          identity: ''
        };
      }
      return agent;
    }));
  };

  const handleForceFailAgent = (id: number) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        addLog(`Manual Override: Terminating AGENT_0${id}`, 'CRITICAL', 'USER_OP');
        return {
          ...agent,
          status: AgentStatus.DEAD_LETTER,
          currentTask: 'FORCE_KILL',
          progress: 100
        };
      }
      return agent;
    }));
    setMetrics(prev => ({ ...prev, dlqCount: prev.dlqCount + 1 }));
  };

  const handleViewLogsAgent = (id: number) => {
    const agent = agents.find(a => a.id === id);
    if (agent) {
       addLog(`AUDIT REQUEST [AGENT_0${id}]: STATUS=${agent.status} | TASK=${agent.currentTask} | ID=${agent.identity || 'NULL'}`, 'INFO', 'AUDIT');
    }
  };

  // --- Core Logic Loop ---
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const currentAgents = [...agentsRef.current];
      let updated = false;
      let activeCount = 0;
      let latencySample = 0;

      // 1. Check Circuit Breaker
      const cbState = circuitBreaker.getState();
      
      // 2. Process Agents
      for (let i = 0; i < currentAgents.length; i++) {
        const agent = currentAgents[i];
        
        // Skip dead letters
        if (agent.status === AgentStatus.DEAD_LETTER) {
          continue;
        }

        // Halt on Circuit Breaker Open
        if (cbState === CircuitState.OPEN && agent.status !== AgentStatus.IDLE) {
           // If running, we might pause or fail. Here we pause.
           if (agent.status !== AgentStatus.FAILED_RETRY) {
             currentAgents[i] = { ...agent, currentTask: 'CIRCUIT_OPEN_HOLD', status: AgentStatus.WAITING_FOR_POOL };
             updated = true;
           }
           continue;
        }

        switch (agent.status) {
          case AgentStatus.IDLE:
          case AgentStatus.FAILED_RETRY:
          case AgentStatus.WAITING_FOR_POOL:
             // Try to start/retry if tokens available and circuit closed/half-open
             if (tokenBucket.tryAcquire(1)) {
                // If Half-Open, only allow 1 agent at a time (simplified here)
                currentAgents[i] = {
                  ...agent,
                  status: AgentStatus.INITIALIZING,
                  currentTask: 'BOOT_BROWSER',
                  progress: 5,
                  identity: generateIdentity(),
                  attempt: agent.status === AgentStatus.FAILED_RETRY ? agent.attempt + 1 : 1
                };
                updated = true;
                addLog(`Agent ${agent.id} dispatched. Attempt ${currentAgents[i].attempt}`, 'INFO', 'DISPATCH', config.stealthMode);
             } else {
               if (agent.status === AgentStatus.IDLE) {
                 currentAgents[i] = { ...agent, currentTask: 'RATE_LIMITED', status: AgentStatus.WAITING_FOR_POOL };
                 updated = true;
               }
             }
             break;

          case AgentStatus.INITIALIZING:
             // Simulate "Warm Pool" check
             currentAgents[i] = {
               ...agent,
               status: AgentStatus.NAVIGATING,
               currentTask: config.stealthMode ? 'INJECTING_NOISE' : 'HEADLESS_INIT',
               progress: 20
             };
             updated = true;
             activeCount++;
             break;

          case AgentStatus.NAVIGATING:
             currentAgents[i] = {
               ...agent,
               status: AgentStatus.ANALYZING,
               currentTask: 'SMART_LOCATOR_SCAN',
               progress: 40
             };
             
             // Chance to narrate navigation
             if (Math.random() > 0.6) {
                 const context = config.stealthMode ? 'stealth_navigation' : 'standard_routing';
                 generateAgentThought(config.targetUrl, context).then(log => {
                    addLog(log, 'DEBUG', `AGENT_0${agent.id}`, config.stealthMode);
                    if (config.audioEnabled) audioQueueRef.current.push(log);
                 });
             }

             updated = true;
             activeCount++;
             break;

          case AgentStatus.ANALYZING:
             currentAgents[i] = {
               ...agent,
               status: AgentStatus.FILLING,
               currentTask: config.stealthMode ? 'HUMAN_TYPING_EMU' : 'FAST_FILL',
               progress: 60
             };
             
             // High chance to narrate analysis/filling
             if (Math.random() > 0.5) {
                 const context = 'form_analysis_injection';
                 generateAgentThought(config.targetUrl, context).then(log => {
                    addLog(log, 'DEBUG', `AGENT_0${agent.id}`, config.stealthMode);
                    if (config.audioEnabled) audioQueueRef.current.push(log);
                 });
             }
             
             updated = true;
             activeCount++;
             break;

          case AgentStatus.FILLING:
             // Humanizer Delay
             const typingTime = humanizer.typingDelay(); 
             // Normally we'd await, but in a tick loop we just move forward
             currentAgents[i] = {
               ...agent,
               status: AgentStatus.SUBMITTING,
               currentTask: 'SUBMIT_PAYLOAD',
               progress: 85
             };
             updated = true;
             activeCount++;
             break;

          case AgentStatus.SUBMITTING:
             // Success/Fail Logic
             const isSuccess = Math.random() > 0.15; // 85% Success Rate base
             latencySample = Math.random() * 500 + 1000; // Simulated latency

             if (isSuccess) {
                circuitBreaker.recordSuccess();
                currentAgents[i] = {
                  ...agent,
                  status: AgentStatus.SUCCESS,
                  currentTask: 'PERSIST_VAULT',
                  progress: 100
                };
                addLog(`Mission Success: ${agent.identity}`, 'SUCCESS', `AGENT_0${agent.id}`, config.stealthMode);
                setMetrics(m => ({ ...m, completedMissions: m.completedMissions + 1 }));
                
                // Occasional Success Narration
                if (config.audioEnabled && Math.random() > 0.7) {
                    audioQueueRef.current.push(`Access granted for agent ${agent.identity}. Data extraction complete.`);
                }

             } else {
                circuitBreaker.recordFailure();
                const nextAttempt = agent.attempt + 1;
                
                if (nextAttempt > agent.maxRetries) {
                  currentAgents[i] = {
                    ...agent,
                    status: AgentStatus.DEAD_LETTER,
                    currentTask: 'SENT_TO_DLQ',
                    progress: 100
                  };
                  addLog(`Max retries exceeded for ${agent.identity}. Moved to Dead Letter Queue.`, 'CRITICAL', 'DLQ_MANAGER');
                  setMetrics(m => ({ ...m, failedMissions: m.failedMissions + 1, dlqCount: m.dlqCount + 1 }));
                } else {
                  currentAgents[i] = {
                    ...agent,
                    status: AgentStatus.FAILED_RETRY,
                    currentTask: `RETRY_BACKOFF_${nextAttempt}`,
                    progress: 100
                  };
                  addLog(`Mission Failed (WAF Block). Retrying...`, 'WARN', `AGENT_0${agent.id}`, config.stealthMode);
                  setMetrics(m => ({ ...m, failedMissions: m.failedMissions + 1 }));
                }
             }
             updated = true;
             activeCount++;
             break;

          case AgentStatus.SUCCESS:
             // Recycle agent
             currentAgents[i] = { ...agent, status: AgentStatus.IDLE, progress: 0, currentTask: 'AWAITING' };
             updated = true;
             break;
        }
      }

      if (updated) {
        setAgents(currentAgents);
      }

      // 3. Congestion Control
      // Update target concurrency based on "observed" latency of the system
      const simulatedSystemLatency = 1200 + (activeCount * 100) + (Math.random() * 200);
      const newConcurrency = congestionControl.update(simulatedSystemLatency);

      // 4. Update Metrics
      const now = new Date();
      setMetrics(prev => ({
        ...prev,
        activeAgents: activeCount,
        rpm: Math.floor((60 / (simulatedSystemLatency/1000)) * activeCount),
        avgLatency: simulatedSystemLatency,
        circuitBreakerStatus: cbState,
        tokenBalance: Math.floor(tokenBucket.getTokens()),
        poolSize: activeCount, // Simplified: Active = Pool Used
        congestionTarget: newConcurrency
      }));

      // History
      if (now.getSeconds() % 2 === 0) {
        setHistory(prev => {
           const newHist = [...prev, {
             time: now.toLocaleTimeString(),
             rpm: metricsRef.current.rpm,
             latency: metricsRef.current.avgLatency
           }];
           return newHist.slice(-20);
        });
      }

    }, 800); // System Tick

    return () => clearInterval(interval);
  }, [isRunning, config, addLog]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 lg:p-6 font-sans selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white flex items-center gap-2">
            <Server className="text-cyan-500" />
            TITAN ULTRA <span className="text-slate-600 text-lg font-mono font-normal">// C2 DASHBOARD</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
             <Shield size={12} /> ENCRYPTED CONNECTION ESTABLISHED | v1.2 HYBRID BACKEND
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className={`px-3 py-1 rounded text-xs font-bold border flex items-center gap-2 ${metrics.circuitBreakerStatus === CircuitState.OPEN ? 'bg-red-950/50 border-red-500 text-red-500' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              CIRCUIT BREAKER: {metrics.circuitBreakerStatus}
           </div>
          <div className={`px-3 py-1 rounded text-xs font-bold border ${isRunning ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {isRunning ? 'SYSTEM ACTIVE' : 'SYSTEM STANDBY'}
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Grid */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Control Deck */}
           <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Target URL Endpoint</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={config.targetUrl}
                      onChange={(e) => setConfig({...config, targetUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors"
                      placeholder="https://target.com/api"
                      disabled={isRunning}
                    />
                    <Search className="absolute right-3 top-2.5 text-slate-600" size={14} />
                  </div>
                </div>
                
                <div className="w-full md:w-28">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Pool Size</label>
                   <input 
                      type="number" 
                      min="1" max="16"
                      value={config.concurrency}
                      onChange={(e) => setConfig({...config, concurrency: parseInt(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                      disabled={isRunning}
                   />
                </div>

                <div className="flex flex-col justify-end pb-1 w-full md:w-auto">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Stealth Protocols</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => !isRunning && setConfig(prev => ({ ...prev, stealthMode: !prev.stealthMode }))}
                            disabled={isRunning}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                                config.stealthMode 
                                    ? 'bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.5)]' 
                                    : 'bg-slate-700'
                            } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform duration-300 ease-in-out mt-1 ml-1 ${config.stealthMode ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                        </button>
                        <span className={`text-xs font-bold transition-colors duration-300 ${config.stealthMode ? 'text-cyan-400 shadow-cyan-500/50 drop-shadow' : 'text-slate-500'}`}>
                            {config.stealthMode ? 'ACTIVE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>

                 <div className="flex flex-col justify-end pb-1 w-full md:w-auto">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Audio Link</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                // Initialize audio context on first click if needed
                                if (!audioContextRef.current) initAudio();
                                setConfig(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }));
                            }}
                            className={`p-1.5 rounded-full transition-all duration-300 border ${
                                config.audioEnabled 
                                    ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                                    : 'bg-slate-800 border-slate-600 text-slate-500'
                            }`}
                        >
                           {config.audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-end">
                   {!isRunning ? (
                     <button 
                       onClick={handleStart}
                       className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded transition-all active:scale-95 shadow-[0_0_15px_rgba(8,145,178,0.3)] h-9"
                     >
                       <Play size={16} fill="currentColor" /> INITIALIZE
                     </button>
                   ) : (
                     <button 
                       onClick={handleStop}
                       className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)] h-9"
                     >
                       <Square size={16} fill="currentColor" /> ABORT
                     </button>
                   )}
                </div>
              </div>
              
              {analysis && (
                <div className="mt-4 p-3 bg-slate-950/50 border border-slate-800 rounded text-xs text-slate-400 font-mono flex items-start gap-2 animate-in fade-in duration-500">
                   <Shield size={14} className="mt-0.5 text-cyan-500" />
                   <span>{analysis}</span>
                </div>
              )}
           </div>

           {/* Metrics & Charts */}
           <MetricsDeck metrics={metrics} history={history} />
           
           {/* Agent Grid */}
           <div>
             <div className="flex justify-between items-end mb-3">
               <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                 <Server size={14} /> ACTIVE NODES
               </h3>
               {metrics.dlqCount > 0 && (
                 <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                   <Database size={12} /> DLQ: {metrics.dlqCount}
                 </span>
               )}
             </div>
             <AgentGrid 
               agents={agents} 
               logs={logs}
               onRestart={handleRestartAgent} 
               onForceFail={handleForceFailAgent} 
               onViewLogs={handleViewLogsAgent} 
             />
           </div>

        </div>

        {/* Right Column: Terminal */}
        <div className="lg:col-span-1 h-[600px] lg:h-auto">
           <Terminal logs={logs} />
        </div>

      </main>
    </div>
  );
}