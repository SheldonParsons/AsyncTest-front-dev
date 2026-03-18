import fs from 'node:fs/promises';
import path from 'node:path';

const MAX = 20;

export function createRecentStore({ userDataPath }) {
    const storePath = path.join(userDataPath, 'recent-amind.json');

    async function load() {
        try {
            const raw = await fs.readFile(storePath, 'utf8');
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    async function save(list) {
        await fs.writeFile(storePath, JSON.stringify(list, null, 2), 'utf8');
    }

    async function add(filePath) {
        const abs = path.resolve(filePath);
        const prev = await load();
        const next = [abs, ...prev.filter(p => p !== abs)].slice(0, MAX);
        await save(next);
        return next;
    }

    async function remove(filePath) {
        const abs = path.resolve(filePath);
        const prev = await load();
        const next = prev.filter(p => p !== abs);
        await save(next);
        return next;
    }

    return { load, add, remove, storePath };
}
