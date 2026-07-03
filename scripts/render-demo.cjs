// Record demo HTML animations into mp4 via Puppeteer + ffmpeg.
// Usage:
//   node scripts/render-demo.js <inputHtml> <outMp4> [--seconds 5.4] [--fps 60] [--width 1920] [--height 1080]

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

function parseArgs(argv) {
  const args = { seconds: 5.4, fps: 60, width: 1920, height: 1080 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[++i];
      args[key] = isNaN(+val) ? val : +val;
    } else {
      positional.push(a);
    }
  }
  args.input = positional[0];
  args.output = positional[1];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error('Usage: node scripts/render-demo.js <input.html> <out.mp4> [--seconds N] [--fps N]');
    process.exit(1);
  }

  const inputAbs = path.resolve(args.input);
  const outputAbs = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outputAbs), { recursive: true });

  const fileUrl = 'file://' + inputAbs;
  const totalFrames = Math.round(args.seconds * args.fps);

  console.log(`[render] ${inputAbs}`);
  console.log(`[render] -> ${outputAbs}`);
  console.log(`[render] ${args.width}x${args.height} @ ${args.fps}fps, ${args.seconds}s (${totalFrames} frames)`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: { width: args.width, height: args.height, deviceScaleFactor: 1 },
    args: [
      `--window-size=${args.width},${args.height}`,
      '--hide-scrollbars',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--force-device-scale-factor=1',
    ],
  });

  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'no-preference' },
  ]);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  // Active screenshot loop: take a PNG each tick, pipe to ffmpeg.
  // Works for static or barely-changing pages (where screencast skips frames).
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(args.fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'veryslow',
    '-crf', '14',
    '-tune', 'animation',
    '-movflags', '+faststart',
    '-r', String(args.fps),
    outputAbs,
  ];
  const ff = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exited ' + code));
    });
  });

  const t0 = Date.now();
  const frameMs = 1000 / args.fps;
  for (let i = 0; i < totalFrames; i++) {
    const targetT = t0 + i * frameMs;
    const wait = targetT - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const buf = await page.screenshot({ type: 'png', omitBackground: false });
    if (!ff.stdin.write(buf)) {
      await new Promise((r) => ff.stdin.once('drain', r));
    }
    if (i % 12 === 0 || i === totalFrames - 1) {
      process.stdout.write(`\r[render] frames ${i + 1}/${totalFrames}`);
    }
  }
  ff.stdin.end();

  await done;
  process.stdout.write(`\n[render] done. ${totalFrames} frames written.\n`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
