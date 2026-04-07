const voices = [
  "en-US-JennyMultilingualNeural",
  "en-US-RyanMultilingualNeural",
  "en-US-SteffanMultilingualNeural",
  "en-US-ChristopherMultilingualNeural",
  "en-US-DavisMultilingualNeural",
  "zh-CN-XiaoxiaoMultilingualNeural",
];

const text = "Xin chào, đây là kiểm tra fallback multilingual tiếng Việt.";

async function run() {
  for (const voice of voices) {
    try {
      const res = await fetch("http://localhost:3001/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, rate: "+0%" }),
      });

      const data: any = await res.json();
      const bytes = data?.audio ? Buffer.from(data.audio, "base64").length : 0;
      console.log(
        JSON.stringify({
          voice,
          status: res.status,
          fallbackApplied: data?.fallbackApplied,
          resolvedVoice: data?.resolvedVoice,
          bytes,
        })
      );
    } catch (error: any) {
      console.log(JSON.stringify({ voice, error: error?.message || String(error) }));
    }
  }
}

run();
