import { ref } from 'vue';
import type { MindSubtreeSnapshot } from './commands/subtreeSnapshot';

export type InternalClipboardState =
  | {
      type: 'empty';
      itemCount: 0;
      totalNodeCount: 0;
      items: [];
      createdAt?: number;
    }
  | {
      type: 'single-subtree' | 'multi-subtree';
      itemCount: number;
      totalNodeCount: number;
      items: MindSubtreeSnapshot[];
      createdAt: number;
      sourceNodeIds?: string[];
    };

export const EMPTY_CLIPBOARD: InternalClipboardState = {
  type: 'empty',
  itemCount: 0,
  totalNodeCount: 0,
  items: [],
};

export const internalClipboardState = ref<InternalClipboardState>(EMPTY_CLIPBOARD);

export function setInternalClipboard(payload: InternalClipboardState) {
  internalClipboardState.value = payload;
}

export function clearInternalClipboard() {
  internalClipboardState.value = EMPTY_CLIPBOARD;
}

export function getInternalClipboard() {
  return internalClipboardState.value;
}
