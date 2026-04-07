const voices = [
  "en-US-JennyNeural",
  "en-GB-SoniaNeural",
  "en-US-DavisNeural",
  "en-US-GuyNeural",
  "en-GB-RyanNeural",
  "en-GB-LibbyNeural",
  "en-US-AriaNeural",
];

const text = "Hello, this is a quick voice verification test for English output.";

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
