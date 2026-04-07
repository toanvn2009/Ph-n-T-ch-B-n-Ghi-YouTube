import { Communicate } from "edge-tts-universal";

const candidates = [
  "en-US-AndrewMultilingualNeural",
  "en-US-BrianMultilingualNeural",
  "en-US-EmmaMultilingualNeural",
  "en-US-JennyMultilingualNeural",
  "en-US-RyanMultilingualNeural",
  "en-US-SteffanMultilingualNeural",
  "en-US-ChristopherMultilingualNeural",
  "en-US-AvaMultilingualNeural",
  "en-US-DavisMultilingualNeural",
  "zh-CN-XiaoxiaoMultilingualNeural",
];

const sample = "Xin chào, đây là bài kiểm tra giọng đọc tiếng Việt đa ngôn ngữ.";

async function check(name: string) {
  try {
    const c = new Communicate(sample, { voice: name, rate: "+0%" });
    let chunks = 0;
    let bytes = 0;
    for await (const chunk of c.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        chunks += 1;
        bytes += chunk.data.length;
      }
    }

    if (bytes > 0) {
      console.log(`[OK] ${name} | chunks=${chunks} | bytes=${bytes}`);
    } else {
      console.log(`[EMPTY] ${name}`);
    }
  } catch (e: any) {
    console.log(`[FAIL] ${name} | ${e?.message || e}`);
  }
}

async function run() {
  for (const voice of candidates) {
    await check(voice);
  }
}

run();
