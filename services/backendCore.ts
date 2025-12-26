import { CircuitState } from '../types';

/**
 * PORT: TITAN ULTRA - Token Bucket Limiter
 * Controls the flow of new operations to prevent API bans.
 */
export class TokenBucket {
  private tokens: number;
  private capacity: number;
  private refillRate: number; // Tokens per second
  private lastRefill: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const added = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + added);
    this.lastRefill = now;
  }

  tryAcquire(cost: number = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * PORT: TITAN ULTRA - Circuit Breaker
 * Prevents cascading failures when the target is down or blocking.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  
  // Config
  private readonly failureThreshold = 5;
  private readonly successThreshold = 3;
  private readonly timeout = 10000; // 10s cool-off

  recordSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN; // Trip immediately on retry fail
    }
  }

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0; // Reset for testing
        return CircuitState.HALF_OPEN;
      }
    }
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * PORT: APEX LEGION - TCP Vegas-style Congestion Control
 * Adjusts concurrency based on observed latency.
 */
export class CongestionController {
  private currentConcurrency: number = 2;
  private minConcurrency = 1;
  private maxConcurrency = 16;
  private targetLatency = 1500; // ms

  // Adjusts target concurrency based on latest latency sample
  update(latency: number): number {
    if (latency > this.targetLatency * 1.5) {
      // Congestion detected, back off
      this.currentConcurrency = Math.max(this.minConcurrency, this.currentConcurrency - 1);
    } else if (latency < this.targetLatency * 0.8) {
      // Room for more
      this.currentConcurrency = Math.min(this.maxConcurrency, this.currentConcurrency + 1);
    }
    return Math.floor(this.currentConcurrency);
  }
}

/**
 * PORT: TITAN ULTRA - Humanizer
 * Gaussian distribution for delays to mimic human interaction.
 */
export const humanizer = {
  typingDelay: (): number => {
    // Mean 80ms, StdDev 20ms
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.max(20, 80 + z * 20);
  },
  
  think: (): number => {
    return Math.random() * 1500 + 500; // 500-2000ms
  }
};