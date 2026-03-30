import { Communicate } from "edge-tts-universal";

async function testVoice(voice: string) {
  try {
    const communicate = new Communicate("Hello world", { voice, rate: "+0%" });
    const audioChunks: Buffer[] = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        audioChunks.push(chunk.data);
      }
    }
    console.log(`Voice '${voice}' SUCCESS, generated ${audioChunks.length} chunks.`);
  } catch (error: any) {
    console.error(`Voice '${voice}' FAILED:`, error.message);
  }
}

async function main() {
  await testVoice("en-US-DavisNeural");
  await testVoice("en-US-SteffanNeural");
  await testVoice("en-US-ChristopherNeural");
  await testVoice("en-US-EricNeural");
  await testVoice("en-US-AriaNeural"); // known good
  await testVoice("en-US-GuyNeural"); // known good
}

main();
