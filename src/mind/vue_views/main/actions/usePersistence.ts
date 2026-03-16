import type { Ref } from 'vue';
import { ensureMindRoots, toPlainDoc } from './useDocUtils';
import type { Camera } from './useCamera';
import { logCameraReset } from '../diagnostics';

export function usePersistence(
  props: { doc?: any; docId?: string },
  camera: Ref<Camera>
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearPersistTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function schedulePersistViewport() {
    clearPersistTimer();

    timer = setTimeout(async () => {
      if (!props.doc || !props.docId) return;

      ensureMindRoots(props.doc);

      props.doc.mind.view = props.doc.mind.view || {};
      props.doc.mind.view.viewport = {
        camera: { ...camera.value },
      };

      const plain = toPlainDoc(props.doc);
      await (window as any).electronAPI.amind.docUpdate({ docId: props.docId, doc: plain });
    }, 600);
  }

  function restoreViewportFromDoc() {
    const d = props.doc;
    if (!d) return false;

    ensureMindRoots(d);

    const vp = d.mind.view?.viewport;
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

  return { schedulePersistViewport, restoreViewportFromDoc, clearPersistTimer };
}
