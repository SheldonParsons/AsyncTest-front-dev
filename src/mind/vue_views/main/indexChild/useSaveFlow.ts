import type { Ref } from 'vue';
import { ensureMindRoots, toPlainDoc } from '../actions/useDocUtils';
import { exportMindPreviewPng } from '../exportPreview';

type SaveResult = {
  filePath?: string | null;
  savedAt?: string | null;
  title?: string | null;
  needSaveAs?: boolean;
} | null | undefined;

type SaveDocumentAsOptions = {
  skipPrepare?: boolean;
  preparedDoc?: any;
};

type UseSaveFlowOptions = {
  getDoc: () => any;
  getDocId: () => string | null | undefined;
  getFilePath: () => string | null | undefined;
  getDocumentTitleForSave: () => string;
  clearPersistTimer: () => void;
  hasEditingSession: () => boolean;
  commitEditingSession: () => void;
  flushPendingDocumentMutation: () => Promise<void>;
  writeViewportToDoc: () => void;
  emitFilePathChange: (value: string | null) => void;
  emitSaveState: (filePath?: string | null) => void;
  isSaving: Ref<boolean>;
  saveError: Ref<string | null>;
  contentRevision: Ref<number>;
  lastSavedContentRevision: Ref<number>;
};

export function useSaveFlow(options: UseSaveFlowOptions) {
  function getSaveAsBaseName() {
    const normalizedRootText = options.getDocumentTitleForSave()
      .replace(/\s+/g, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
      .trim();
    return normalizedRootText || '思维导图';
  }

  async function syncDocumentToMainProcess() {
    const doc = options.getDoc();
    const docId = options.getDocId();
    if (!doc || !docId) return null;
    ensureMindRoots(doc);
    doc.manifest = doc.manifest || {};
    doc.manifest.title = options.getDocumentTitleForSave();
    options.writeViewportToDoc();
    const plain = toPlainDoc(doc);
    await window.electronAPI.amind.docUpdate({ docId, doc: plain });
    return plain;
  }

  async function flushForSave() {
    if (!options.getDoc() || !options.getDocId()) return null;
    options.clearPersistTimer();
    if (options.hasEditingSession()) options.commitEditingSession();
    await options.flushPendingDocumentMutation();
    return await syncDocumentToMainProcess();
  }

  function applySaveResult(result: SaveResult) {
    const doc = options.getDoc();
    if (!result) return options.getFilePath() ?? null;
    if (doc?.manifest) {
      if (typeof result.savedAt === 'string' && result.savedAt) {
        doc.manifest.updatedAt = result.savedAt;
      }
      if (typeof result.title === 'string' && result.title) {
        doc.manifest.title = result.title;
      }
    }
    options.lastSavedContentRevision.value = options.contentRevision.value;
    options.saveError.value = null;
    if (typeof result.filePath === 'string') {
      options.emitFilePathChange(result.filePath);
      return result.filePath;
    }
    return options.getFilePath() ?? null;
  }

  async function persistRecentPreview(
    docSnapshot: any,
    previewOptions: { filePath?: string | null; savedAt?: string | null; title?: string | null }
  ) {
    const filePath = typeof previewOptions.filePath === 'string' && previewOptions.filePath ? previewOptions.filePath : null;
    if (!filePath || !docSnapshot) return;
    const pngBytes = await exportMindPreviewPng(docSnapshot);
    if (!pngBytes?.length) return;
    await window.electronAPI.amind.saveRecentPreview({
      filePath,
      bytes: pngBytes,
      title: typeof previewOptions.title === 'string' && previewOptions.title
        ? previewOptions.title
        : docSnapshot?.manifest?.title ?? null,
      updatedAt: typeof previewOptions.savedAt === 'string' && previewOptions.savedAt
        ? previewOptions.savedAt
        : docSnapshot?.manifest?.updatedAt ?? null,
    });
  }

  function scheduleRecentPreviewPersist(
    docSnapshot: any,
    previewOptions: { filePath?: string | null; savedAt?: string | null; title?: string | null }
  ) {
    void persistRecentPreview(docSnapshot, previewOptions).catch((error) => {
      console.error('[mind-preview-save]', error);
    });
  }

  function notifySaveFailure(error: unknown) {
    const message = error instanceof Error ? error.message : '保存失败';
    options.saveError.value = message;
    console.error('[mind-save]', error);
    window.alert(message);
  }

  function waitForMinimumDuration(startedAt: number, minimumMs: number) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= minimumMs) return Promise.resolve();
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, minimumMs - elapsed);
    });
  }

  async function saveDocumentAs(saveOptions?: SaveDocumentAsOptions) {
    const docId = options.getDocId();
    const doc = options.getDoc();
    if (!docId || options.isSaving.value) return false;
    let nextFilePath = options.getFilePath() ?? null;
    const startedAt = Date.now();
    options.isSaving.value = true;
    options.emitSaveState(nextFilePath);
    try {
      const preparedDoc = saveOptions?.skipPrepare ? saveOptions?.preparedDoc ?? toPlainDoc(doc) : await flushForSave();
      if (!preparedDoc) return false;
      const defaultPath = options.getFilePath() ?? `${getSaveAsBaseName()}.amind`;
      const result = await window.electronAPI.amind.saveAsDialog({
        docId,
        defaultPath,
      });
      if (!result) return false;
      nextFilePath = applySaveResult(result);
      scheduleRecentPreviewPersist(preparedDoc, {
        filePath: nextFilePath,
        savedAt: result?.savedAt ?? null,
        title: result?.title ?? null,
      });
      return true;
    } catch (error) {
      notifySaveFailure(error);
      return false;
    } finally {
      await waitForMinimumDuration(startedAt, 1000);
      options.isSaving.value = false;
      options.emitSaveState(nextFilePath);
    }
  }

  async function saveDocument() {
    const docId = options.getDocId();
    if (!docId || options.isSaving.value) return false;
    if (!options.getFilePath()) {
      return await saveDocumentAs();
    }
    let nextFilePath = options.getFilePath() ?? null;
    const startedAt = Date.now();
    options.isSaving.value = true;
    options.emitSaveState(nextFilePath);
    try {
      const prepared = await flushForSave();
      if (!prepared) return false;
      const result = await window.electronAPI.amind.save({ docId });
      if (result?.needSaveAs) {
        return await saveDocumentAs({ skipPrepare: true, preparedDoc: prepared });
      }
      nextFilePath = applySaveResult(result);
      scheduleRecentPreviewPersist(prepared, {
        filePath: nextFilePath,
        savedAt: result?.savedAt ?? null,
        title: result?.title ?? null,
      });
      return true;
    } catch (error) {
      notifySaveFailure(error);
      return false;
    } finally {
      await waitForMinimumDuration(startedAt, 1000);
      options.isSaving.value = false;
      options.emitSaveState(nextFilePath);
    }
  }

  return {
    saveDocument,
    saveDocumentAs,
  };
}
