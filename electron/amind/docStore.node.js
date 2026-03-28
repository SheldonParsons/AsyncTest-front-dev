export function createDocStore() {
  // docId -> { doc, filePath, windowKey }
  const map = new Map();

  function create(docId, { doc, filePath = null, windowKey = null }) {
    map.set(docId, { doc, filePath, windowKey });
    return map.get(docId);
  }

  function get(docId) {
    return map.get(docId) || null;
  }

  function mustGet(docId) {
    const entry = get(docId);
    if (!entry) throw new Error(`docStore: missing docId ${docId}`);
    return entry;
  }

  function setDoc(docId, doc) {
    const entry = mustGet(docId);
    entry.doc = doc;
    return entry;
  }

  function setFilePath(docId, filePath) {
    const entry = mustGet(docId);
    entry.filePath = filePath;
    return entry;
  }

  function setWindowKey(docId, windowKey) {
    const entry = mustGet(docId);
    entry.windowKey = windowKey;
    return entry;
  }

  function remove(docId) {
    map.delete(docId);
  }

  function entries() {
    return Array.from(map.entries());
  }

  return { create, get, mustGet, setDoc, setFilePath, setWindowKey, remove, entries };
}
