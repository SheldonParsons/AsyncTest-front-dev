import type { Ref } from 'vue';
import { ensureMindRoots, getActiveMind, toPlainDoc } from './useDocUtils';
import type { Camera } from './useCamera';
import { logCameraReset } from '../diagnostics';

export function usePersistence(
  props: { doc?: any; docId?: string },
  camera: Ref<Camera>
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function writeViewportToDoc() {
    if (!props.doc) return null;

    ensureMindRoots(props.doc);
    const activeMind = getActiveMind(props.doc);
    if (!activeMind) return null;

    activeMind.view = activeMind.view || {};
    activeMind.view.viewport = {
      camera: { ...camera.value },
    };

    return activeMind.view.viewport;
  }

  function clearPersistTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function schedulePersistViewport() {
    clearPersistTimer();

    timer = setTimeout(async () => {
      if (!props.doc || !props.docId) return;

      writeViewportToDoc();
      const plain = toPlainDoc(props.doc);
      await (window as any).electronAPI.amind.docUpdate({ docId: props.docId, doc: plain });
    }, 600);
  }

  function restoreViewportFromDoc() {
    const d = props.doc;
    if (!d) return false;

    ensureMindRoots(d);
    const activeMind = getActiveMind(d);
    if (!activeMind) return false;

    const vp = activeMind.view?.viewport;
    if (!vp?.camera) return false;

    if (typeof vp.camera.scale === 'number') {
      const before = { ...camera.value };
      camera.value = {
        scale: vp.camera.scale,
        tx: vp.camera.tx ?? 0,
        ty: vp.camera.ty ?? 0,
      };
      logCameraReset('restoreViewportFromDoc', before, camera.value, {
        hasViewportCamera: true,
      });
      return true;
    }

    return false;
  }

  return { schedulePersistViewport, restoreViewportFromDoc, clearPersistTimer, writeViewportToDoc };
}
