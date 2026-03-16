// amind 主进程缓存
import { sha256Hex, extFromMime, guessMimeFromPath, readImageFileAsBytes } from '../shared/assetService.node.js';

export function createAmindAssetCache() {
    const perFile = new Map();

    function getMap(fileKey) {
        if (!perFile.has(fileKey)) perFile.set(fileKey, new Map());
        return perFile.get(fileKey);
    }

    function makeKey(assetId, ext) {
        return `${assetId}.${ext}`;
    }

    function putBytes({ fileKey, assetId, ext, mime, bytes, dirty }) {
        const m = getMap(fileKey);
        m.set(makeKey(assetId, ext), { assetId, ext, mime, bytes, dirty: !!dirty });
    }

    function getBytes({ fileKey, assetId, ext }) {
        const m = getMap(fileKey);
        return m.get(makeKey(assetId, ext)) || null;
    }

    function listDirty(fileKey) {
        const m = getMap(fileKey);
        return [...m.values()].filter(v => v.dirty);
    }

    function markClean(fileKey, assetIdsExts) {
        const m = getMap(fileKey);
        for (const { assetId, ext } of assetIdsExts) {
            const k = makeKey(assetId, ext);
            const v = m.get(k);
            if (v) v.dirty = false;
        }
    }

    async function addFromFile({ fileKey, sourceImagePath }) {
        const mime = guessMimeFromPath(sourceImagePath) || 'application/octet-stream';
        const ext = extFromMime(mime) || 'bin';
        const bytes = await readImageFileAsBytes(sourceImagePath);
        const assetId = sha256Hex(bytes);
        putBytes({ fileKey, assetId, ext, mime, bytes, dirty: true });
        return { assetId, ext, mime };
    }

    async function addFromBytes({ fileKey, bytes, mime }) {
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const ext = extFromMime(mime) || 'bin';
        const assetId = sha256Hex(u8);
        putBytes({ fileKey, assetId, ext, mime, bytes: u8, dirty: true });
        return { assetId, ext, mime };
    }

    return {
        putBytes,
        getBytes,
        listDirty,
        markClean,
        addFromFile,
        addFromBytes,
    };
}