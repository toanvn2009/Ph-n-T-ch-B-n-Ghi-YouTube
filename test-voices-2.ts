import { Communicate } from "edge-tts-universal";

async function check(name: string) {
  try {
    const c = new Communicate("Hello", { voice: name });
    for await (const chunk of c.stream()) {}
    console.log(`[OK] ${name}`);
  } catch (e: any) {
    console.log(`[FAIL] ${name} - ${e.message}`);
  }
}

async function run() {
  await check("en-US-GuyNeural");
  await check("en-US-ChristopherNeural");
  await check("en-US-EricNeural");
  await check("en-US-RogerNeural");
  await check("en-US-SteffanNeural");
  await check("en-US-BrianNeural");
  await check("en-AU-WilliamNeural");
  await check("en-GB-RyanNeural");
}
run();
