import { Communicate } from "edge-tts-universal";

async function check(name: string) {
  try {
    const c = new Communicate("Xin chào", { voice: name });
    let gotAudio = false;
    for await (const chunk of c.stream()) {
      if (chunk.type === "audio" && chunk.data && chunk.data.length > 0) {
        gotAudio = true;
      }
    }
    if (gotAudio) {
      console.log(`[OK] ${name}`);
    } else {
      console.log(`[FAIL - EMPTY] ${name}`);
    }
  } catch (e: any) {
    console.log(`[FAIL - ERROR] ${name} - ${e.message}`);
  }
}

async function run() {
  await check("en-US-JennyMultilingualNeural");
  await check("en-US-RyanMultilingualNeural");
  await check("zh-CN-XiaoxiaoMultilingualNeural");
  await check("en-US-EmmaMultilingualNeural");
  await check("en-US-BrianMultilingualNeural");
  await check("en-US-AndrewMultilingualNeural");
}
run();
