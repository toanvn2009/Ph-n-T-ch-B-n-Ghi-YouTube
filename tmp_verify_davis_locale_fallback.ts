import { Communicate } from 'edge-tts-universal';

const DEFAULT_FALLBACK_VOICE = 'vi-VN-HoaiMyNeural';
const EN_US_FALLBACK_VOICE = 'en-US-GuyNeural';
const EN_GB_FALLBACK_VOICE = 'en-GB-RyanNeural';

function getFallbackVoice(requestedVoice: string): string {
  if (requestedVoice.startsWith('en-GB-')) return EN_GB_FALLBACK_VOICE;
  if (requestedVoice.startsWith('en-')) return EN_US_FALLBACK_VOICE;
  return DEFAULT_FALLBACK_VOICE;
}

async function synthesizeToBase64(text: string, voice: string) {
  const communicate = new Communicate(text, { voice, rate: '+0%' });
  const chunks: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === 'audio' && chunk.data) chunks.push(chunk.data);
  }
  const audio = Buffer.concat(chunks);
  if (!audio.length) throw new Error('No audio generated');
  return audio.toString('base64');
}

async function run() {
  const voice = 'en-US-DavisNeural';
  const text = 'This is a fallback verification for Davis voice.';

  let resolvedVoice = voice;
  let fallbackApplied = false;

  try {
    await synthesizeToBase64(text, voice);
  } catch {
    resolvedVoice = getFallbackVoice(voice);
    fallbackApplied = true;
    await synthesizeToBase64(text, resolvedVoice);
  }

  console.log(JSON.stringify({ voice, resolvedVoice, fallbackApplied }));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
