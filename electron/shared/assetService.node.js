// 生成 assetId、识别 ext、读取文件、hash
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

const MIME_TO_EXT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
};

export function sha256Hex(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function extFromMime(mime) {
    return MIME_TO_EXT[mime] || null;
}

export function guessMimeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'svg') return 'image/svg+xml';
    return null;
}

export async function readImageFileAsBytes(filePath) {
    const buf = await fs.readFile(filePath);
    return new Uint8Array(buf);
}