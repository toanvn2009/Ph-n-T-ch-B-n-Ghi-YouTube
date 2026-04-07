import { Communicate } from "edge-tts-universal";
import fs from "fs";

async function test() {
  const text = "Xin chào, đây là bài kiểm tra giọng đọc.";
  const voice = "vi-VN-HoaiMyNeural";
  console.log(`Testing TTS with voice: ${voice}...`);
  
  try {
    const communicate = new Communicate(text, { voice });
    const chunks = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio") {
        chunks.push(chunk.data);
      }
    }
    const buffer = Buffer.concat(chunks);
    console.log(`Success! Generated ${buffer.length} bytes.`);
    fs.writeFileSync("test-tts.mp3", buffer);
  } catch (error: any) {
    console.error("FAILED to generate TTS:");
    console.error(error);
  }
}

test();
