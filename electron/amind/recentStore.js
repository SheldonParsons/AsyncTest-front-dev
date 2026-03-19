import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX = 20;

function normalizeFilePath(filePath) {
    const normalized = String(filePath ?? '').trim();
    if (!normalized) return '';
    return path.resolve(normalized);
}

function normalizeRecentEntry(input) {
    if (!input) return null;
    if (typeof input === 'string') {
        const filePath = normalizeFilePath(input);
        return filePath ? { filePath } : null;
    }
    if (typeof input !== 'object') return null;
    const filePath = normalizeFilePath(input.filePath);
    if (!filePath) return null;
    return {
        filePath,
        title: typeof input.title === 'string' && input.title ? input.title : undefined,
        updatedAt: typeof input.updatedAt === 'string' && input.updatedAt ? input.updatedAt : undefined,
        previewPath: typeof input.previewPath === 'string' && input.previewPath ? input.previewPath : undefined,
        previewUpdatedAt: typeof input.previewUpdatedAt === 'string' && input.previewUpdatedAt ? input.previewUpdatedAt : undefined,
    };
}

function dedupeEntries(entries) {
    const seen = new Set();
    const result = [];
    for (const entry of entries) {
        const normalized = normalizeRecentEntry(entry);
        if (!normalized || seen.has(normalized.filePath)) continue;
        seen.add(normalized.filePath);
        result.push(normalized);
    }
    return result.slice(0, MAX);
}

async function toRendererEntry(entry) {
    let previewUrl = null;
    if (entry.previewPath) {
        try {
            const bytes = await fs.readFile(entry.previewPath);
            previewUrl = `data:image/png;base64,${bytes.toString('base64')}`;
        } catch {
            previewUrl = null;
        }
    }
    return {
        ...entry,
        previewUrl,
    };
}

export function createRecentStore({ userDataPath }) {
    const storePath = path.join(userDataPath, 'recent-amind.json');
    const previewDir = path.join(userDataPath, 'amind-previews');

    async function loadEntries() {
        try {
            const raw = await fs.readFile(storePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return dedupeEntries(parsed);
        } catch {
            return [];
        }
    }

    async function saveEntries(entries) {
        const next = dedupeEntries(entries);
        await fs.mkdir(path.dirname(storePath), { recursive: true });
        await fs.writeFile(storePath, JSON.stringify(next, null, 2), 'utf8');
        return next;
    }

    function createPreviewPath(filePath) {
        const hash = createHash('sha1').update(normalizeFilePath(filePath)).digest('hex');
        return path.join(previewDir, `${hash}.png`);
    }

    async function load() {
        const entries = await loadEntries();
        return entries.map((entry) => entry.filePath);
    }

    async function loadRendererEntries() {
        const entries = await loadEntries();
        return await Promise.all(entries.map((entry) => toRendererEntry(entry)));
    }

    async function add(filePath, patch = {}) {
        const normalizedPath = normalizeFilePath(filePath);
        const prev = await loadEntries();
        const existing = prev.find((entry) => entry.filePath === normalizedPath) ?? null;
        const nextEntry = normalizeRecentEntry({
            ...existing,
            filePath: normalizedPath,
            ...patch,
        });
        const next = [nextEntry, ...prev.filter((entry) => entry.filePath !== normalizedPath)];
        return await saveEntries(next);
    }

    async function update(filePath, patch = {}) {
        const normalizedPath = normalizeFilePath(filePath);
        const prev = await loadEntries();
        const existing = prev.find((entry) => entry.filePath === normalizedPath) ?? { filePath: normalizedPath };
        const nextEntry = normalizeRecentEntry({
            ...existing,
            ...patch,
            filePath: normalizedPath,
        });
        const next = [nextEntry, ...prev.filter((entry) => entry.filePath !== normalizedPath)];
        return await saveEntries(next);
    }

    async function remove(filePath) {
        const normalizedPath = normalizeFilePath(filePath);
        const prev = await loadEntries();
        const target = prev.find((entry) => entry.filePath === normalizedPath) ?? null;
        const next = prev.filter((entry) => entry.filePath !== normalizedPath);
        await saveEntries(next);
        if (target?.previewPath) {
            await fs.rm(target.previewPath, { force: true }).catch(() => {});
        }
        return next.map((entry) => entry.filePath);
    }

    async function savePreview(filePath, bytes, patch = {}) {
        const normalizedPath = normalizeFilePath(filePath);
        const previewPath = createPreviewPath(normalizedPath);
        await fs.mkdir(previewDir, { recursive: true });
        await fs.writeFile(previewPath, bytes);
        const entries = await update(normalizedPath, {
            ...patch,
            previewPath,
            previewUpdatedAt: new Date().toISOString(),
        });
        return entries.find((entry) => entry.filePath === normalizedPath) ?? null;
    }

    return {
        load,
        loadEntries,
        loadRendererEntries,
        add,
        update,
        remove,
        savePreview,
        createPreviewPath,
        storePath,
        previewDir,
    };
}
