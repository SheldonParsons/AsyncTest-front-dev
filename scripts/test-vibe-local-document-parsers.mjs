import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import JSZip from "jszip";

import { identityOf, makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";

function minimalPdf(text) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 18 Tf 50 150 Td (${text}) Tj ET`;
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), "vibe-doc-parser-"));
const pdfPath = path.join(temporary, "sample.pdf");
const sheetPath = path.join(temporary, "sample.xlsx");
const slidesPath = path.join(temporary, "sample.pptx");
await writeFile(pdfPath, minimalPdf("PDF local parse"));
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Name", "Value"], ["Alpha", "42"]]), "Data");
XLSX.writeFile(workbook, sheetPath);
const zip = new JSZip();
zip.file("ppt/slides/slide1.xml", "<p:sld xmlns:p='p' xmlns:a='a'><p:cSld><a:p><a:r><a:t>Slide local parse</a:t></a:r></a:p></p:cSld></p:sld>");
await writeFile(slidesPath, await zip.generateAsync({ type: "nodebuffer" }));

const identity = { run_id: "document-run", turn_id: "document-turn", request_id: "document-request" };
const start = makeFrame(identity, "start", {
  execution_mode: "local",
  system_prompt: "读取文件。",
  prompt: "读取三个文件。",
  tools: [],
  provider: {
    id: "fake", model: "fake-model", api: "openai-completions", mode: "direct",
    base_url: "https://example.invalid/v1", api_key: "fake-key", reasoning: false,
  },
  options: { max_retries: 0, tool_choice: "auto" },
  fake: { responses: [
    { tool_calls: [
      { id: "pdf", name: "read", arguments: { path: pdfPath } },
      { id: "sheet", name: "read", arguments: { path: sheetPath } },
      { id: "slides", name: "read", arguments: { path: slidesPath } },
    ] },
    { text: "完成。" },
  ] },
});
const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const child = spawn(electron, [path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs")], {
  env: {
    PATH: process.env.PATH,
    LANG: process.env.LANG || "C",
    TMPDIR: process.env.TMPDIR || os.tmpdir(),
    ELECTRON_RUN_AS_NODE: "1",
    NODE_NO_WARNINGS: "1",
    VIBE_PI_PARENT_PID: String(process.pid),
    VIBE_PI_APP_ROOT: root,
  },
  stdio: ["pipe", "pipe", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
child.stdin.write(`${start.serialized}\n`);
const frames = [];
for await (const line of readline.createInterface({ input: child.stdout, crlfDelay: Infinity })) {
  const frame = parseOutboundLine(line, identityOf(start.frame));
  frames.push(frame);
  if (frame.type === "candidate_final") {
    child.stdin.write(`${makeFrame(identity, "finish", {}, { reply_to: frame.message_id }).serialized}\n`);
  }
}
const exitCode = await new Promise((resolve) => child.once("close", resolve));

try {
  assert.equal(exitCode, 0, stderr);
  const results = Object.fromEntries(frames.filter((frame) => frame.type === "local_tool_end")
    .map((frame) => [frame.payload.tool_call_id, frame.payload]));
  assert.equal(Object.keys(results).length, 3);
  assert.equal(Object.values(results).every((item) => item.is_error === false), true, JSON.stringify(results, null, 2));
  assert.match(JSON.stringify(results.pdf.result), /PDF local parse/);
  assert.match(JSON.stringify(results.sheet.result), /Alpha/);
  assert.match(JSON.stringify(results.sheet.result), /\| Name \| Value \|/);
  assert.match(JSON.stringify(results.slides.result), /Slide local parse/);
  assert.equal(results.pdf.result.details.parser.name, "pdfjs-dist");
  assert.equal(results.sheet.result.details.parser.version, "0.18.5");
  assert.equal(results.slides.result.details.parser.name, "jszip");
  console.log("PASS: PDF, Excel and PPTX use auditable local read adapters and return Markdown");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
