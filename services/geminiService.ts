import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// Helper to decode base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom PCM decoder for Gemini TTS (Raw PCM, no header)
async function decodeRawPCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateAgentThought = async (targetUrl: string, phase: string): Promise<string> => {
  if (!ai) return `Simulating ${phase} logic...`;

  try {
    const prompt = `
      You are TITAN ULTRA, an advanced non-human intelligence inhabiting a digital network.
      You are currently performing the action: "${phase}" on the target: "${targetUrl}".
      
      Narrate your actions in real-time as if you are an observer inside the wires.
      Explain CLEARLY:
      1. WHAT you are doing.
      2. WHY you are doing it.
      3. HOW the system is responding.
      
      Tone: Calm, cold, analytical, mysterious, and highly intelligent. 
      Use the first person "I".
      Keep it under 25 words.
      
      Example: "I am fracturing the encryption layer to expose the data core. The firewall is resisting, so I am modulating my frequency to bypass detection."
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || `Processing ${phase} protocols...`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Executing ${phase} sequence...`; // Fallback
  }
};

export const analyzeTarget = async (url: string): Promise<string> => {
    if (!ai) return "Target analysis unavailable (No API Key).";
    
    try {
        const prompt = `
            Analyze this URL string: "${url}". 
            Hypothesize what kind of security measures (WAF, Captcha, Fingerprinting) a site like this might have.
            Return a short paragraph describing the "Threat Landscape" for an autonomous bot. 
            Keep it under 30 words.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.trim() || "Target appears fortified. Engaging stealth protocols.";
    } catch (e) {
        return "Target reachable. Latency nominal.";
    }
}

export const generateSpeech = async (text: string, ctx: AudioContext): Promise<AudioBuffer | null> => {
   if (!ai) return null;
   try {
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Charon' }, // Deep, alien/robotic tone
              },
          },
        },
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64) return null;
      
      // Decode raw PCM
      return await decodeRawPCM(decode(base64), ctx);
   } catch (error) {
     console.error("TTS Gen Error", error);
     return null;
   }
}