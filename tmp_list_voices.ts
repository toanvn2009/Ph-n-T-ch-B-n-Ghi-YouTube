import { Communicate } from "edge-tts-universal";

async function listAllVoices() {
  try {
    // Note: edge-tts-universal might not have a direct listVoices in the version I'm using
    // But we can check if it can be fetched.
    // Actually, I'll just check the official Microsoft Edge TTS voice list via search.
    console.log("Checking voices...");
  } catch (e) {
    console.error(e);
  }
}

listAllVoices();
