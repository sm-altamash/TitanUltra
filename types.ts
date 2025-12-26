export enum AgentStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING', // Booting up
  WAITING_FOR_POOL = 'WAITING_FOR_POOL', // Waiting for browser slot
  NAVIGATING = 'NAVIGATING',
  ANALYZING = 'ANALYZING',
  FILLING = 'FILLING',
  SUBMITTING = 'SUBMITTING',
  SUCCESS = 'SUCCESS',
  FAILED_RETRY = 'FAILED_RETRY', // Temporary failure
  DEAD_LETTER = 'DEAD_LETTER', // Permanent failure (DLQ)
  COOLDOWN = 'COOLDOWN'
}

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, traffic stopped
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface Agent {
  id: number;
  status: AgentStatus;
  currentTask: string;
  identity: string;
  progress: number; // 0-100
  attempt: number;
  maxRetries: number;
  logs: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG' | 'CRITICAL';
  source: string;
  message: string;
  isStealth?: boolean;
}

export interface Metrics {
  activeAgents: number;
  completedMissions: number;
  failedMissions: number;
  dlqCount: number;
  rpm: number;
  avgLatency: number;
  circuitBreakerStatus: CircuitState;
  tokenBalance: number; // For Rate Limiter visualization
  poolSize: number; // Active browser instances
  congestionTarget: number; // Recommended concurrency
}

export interface SwarmConfig {
  targetUrl: string;
  concurrency: number;
  stealthMode: boolean;
  rateLimitTokens: number;
  refillRate: number;
  audioEnabled: boolean;
}