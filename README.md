# TITAN ULTRA // C2 DASHBOARD

**Enterprise Autonomous Agent Swarm Orchestrator**

TITAN ULTRA is a high-fidelity simulation and management dashboard for autonomous web agents. Designed with a "Command & Control" (C2) aesthetic, it orchestrates a swarm of headless agents to perform tasks on target endpoints while managing rate limits, congestion, and stealth protocols.

This application demonstrates advanced frontend engineering concepts including complex state management, real-time data visualization, and the implementation of backend resiliency patterns (Circuit Breakers, Token Buckets) within a client-side environment.

---

## 🚀 Key Features

### 🧠 AI-Driven Intelligence
*   **Target Reconnaissance:** Uses **Google Gemini 3 Flash** to analyze target URLs upon initialization, hypothesizing security defenses (WAF, Captcha, Fingerprinting) and displaying a threat landscape report.
*   **Narrative Intelligence:** Agents generate continuous, first-person narration using Generative AI, acting as "observers inside the system."
*   **Voice Synthesis (TTS):** Uses **Gemini 2.5 Flash TTS** processed through a custom audio engine to vocalize system actions.
*   **Immersive Audio Engine:** 
    *   **Dark Ambience:** Generates a real-time, multi-oscillator cinematic soundscape with binaural beats and low-frequency drones.
    *   **Alien Voice FX:** Processes TTS output with metallic delay and frequency modulation to create a distinct, otherworldly intelligence persona.

### 🛡️ Resilience & Engineering Patterns
*   **Circuit Breaker:** Prevents cascading failures. If the error rate exceeds a threshold, the system halts new dispatches to allow the target to recover.
*   **Token Bucket Rate Limiter:** Visualizes API quota usage in real-time with an **animated refill rate indicator**. Agents must acquire a token before launching.
*   **Congestion Control (TCP Vegas-style):** An adaptive algorithm that automatically scales the concurrency pool up or down based on observed system latency.
*   **Dead Letter Queue (DLQ):** Permanently failed agents (after max retries) are moved to a DLQ for manual inspection.

### 🕵️ Stealth Operations
*   **Stealth Toggle:** A dedicated UI switch to enable/disable stealth protocols.
*   **Stealth Behavior:** When active, agents inject randomized delays and noise. Logs generated during stealth ops are **visually distinguished** in the terminal with cyan highlights and specific iconography.

### 📊 Real-Time Telemetry
*   **Live Metrics:** Monitoring of RPM (Requests Per Minute), Latency, and Active Threads.
*   **Interactive Terminal:** A scrolling log window handling system-wide events.
*   **Agent Grid:** Individual card view for every active agent.
    *   **Status Animations:** Visual cues (pulsing, spinning) indicate agent state.
    *   **Retry Indicators:** Explicitly displays the current attempt count (e.g., "TRY:2") if the agent encountered a transient failure.
*   **Node Inspector:** Click into any agent to view a dedicated modal with chronological logs specific to that unit.

---

## 🛠️ Tech Stack

*   **Framework:** React 19 (TypeScript)
*   **Styling:** Tailwind CSS
*   **AI:** @google/genai SDK (Gemini 3 Flash & 2.5 TTS)
*   **Audio:** Web Audio API (Oscillators, GainNodes, DelayNodes, BiquadFilters)
*   **Visualization:** Recharts
*   **Icons:** Lucide React
*   **Build:** ES Modules (Client-side execution)

---

## 📦 Architecture

Although this runs entirely in the browser, it simulates a robust backend architecture:

1.  **Orchestrator (App.tsx):** The main loop running at 800ms ticks. It manages the lifecycle of agents from `IDLE` to `SUCCESS` or `DEAD_LETTER`.
2.  **Services:**
    *   `backendCore.ts`: Contains the logic for the Token Bucket, Circuit Breaker, and Congestion Controller.
    *   `geminiService.ts`: Interfaces with Google's Generative AI for dynamic content generation and TTS.
    *   `identityFactory.ts`: Generates synthetic identities for agents.
3.  **Components:**
    *   `AgentGrid`: Renders the individual bot cards and handles the Inspector Modal.
    *   `MetricsDeck`: Displays the HUD for system health.
    *   `Terminal`: The scrolling log output.

---

## 🚦 Usage Guide

### Prerequisite
You need a valid **Google Gemini API Key** set in your environment variables as `API_KEY` for the AI features to function.

### Dashboard Controls

1.  **Target Configuration:**
    *   Enter a target URL (e.g., `https://api.target.com`).
    *   Set the initial **Pool Size** (Concurrency).
    *   Toggle **Stealth Protocols** using the switch.
    *   Toggle **Audio Link** (Speaker Icon) for voice/ambience. **Note:** You must interact with the page first to enable audio.

2.  **Initialization:**
    *   Click **INITIALIZE** to boot the swarm.
    *   The system will perform an AI analysis of the target URL.
    *   Agents will begin requesting tokens and launching.

3.  **Agent Interaction:**
    *   **Restart (↺):** Manually reboot a specific agent.
    *   **Force Fail (⊘):** Simulate a critical failure to test the Circuit Breaker or DLQ logic.
    *   **View Logs (📄):** Open the Node Inspector modal for deep-dive telemetry.

4.  **Monitoring:**
    *   Watch the **Circuit Breaker** status in the header.
    *   Monitor the **Token Bucket** refill rate in the Metrics Deck.
    *   Observe the **Throughput vs. Congestion** charts to see the adaptive scaling in action.

---

## 🎨 Design Philosophy

The UI is built with a "Dark Mode First" approach, utilizing `slate-950` backgrounds and high-contrast accent colors (Cyan, Emerald, Red, Yellow) to convey system status immediately. The typography mixes `Inter` for UI elements and `JetBrains Mono` for data/logs to enhance the technical feel.

---

**License**
MIT