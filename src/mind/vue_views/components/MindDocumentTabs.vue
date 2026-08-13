<template>
  <div ref="barRef" class="mind-document-bar">
    <div ref="tabsRef" class="mind-document-tabs" role="tablist" aria-label="打开的思维导图" @wheel="onTabsWheel">
      <button
        v-for="document in documents"
        :key="document.docId"
        :ref="(element) => setTabRef(document.docId, element)"
        class="mind-document-tab"
        :class="{ 'is-active': document.docId === activeDocId }"
        type="button"
        role="tab"
        :aria-selected="document.docId === activeDocId"
        :title="document.label"
        @click="emit('activate', document.docId)"
        @auxclick.middle.prevent="emit('close', document.docId)"
      >
        <img class="mind-document-icon" :src="mindIcon" alt="" />
        <span class="mind-document-label">{{ stripAmindExtension(document.label) }}</span>
        <span v-if="document.isDirty" class="mind-document-dirty" aria-label="有未保存修改"></span>
        <span v-if="document.isSaving" class="mind-document-saving" aria-label="保存中"></span>
        <span
          v-else
          class="mind-document-close"
          role="button"
          aria-label="关闭文档"
          title="关闭"
          @click.stop="emit('close', document.docId)"
        >×</span>
      </button>

      <button ref="newTabButtonRef" class="mind-document-tool mind-document-new" type="button"
        aria-label="新建思维导图" title="新建思维导图" @click="emit('new')">
        <span class="mind-document-plus" aria-hidden="true"></span>
      </button>
    </div>

    <div class="mind-document-list-shell">
      <button
        class="mind-document-tool"
        :class="{ 'is-active': listOpen }"
        type="button"
        aria-label="查看全部打开的文档"
        title="全部打开的文档"
        :aria-expanded="listOpen"
        @click.stop="listOpen = !listOpen"
      >
        <span class="mind-document-chevron" aria-hidden="true"></span>
      </button>

      <transition name="mind-document-list">
        <div v-if="listOpen" class="mind-document-list" @click.stop>
          <div class="mind-document-list-header">
            <span>打开的思维导图</span>
            <span>{{ documents.length }}</span>
          </div>
          <button
            v-for="document in documents"
            :key="`list-${document.docId}`"
            class="mind-document-list-item"
            :class="{ 'is-active': document.docId === activeDocId }"
            type="button"
            :title="document.label"
            @click="activateFromList(document.docId)"
          >
            <img class="mind-document-list-icon" :src="mindIcon" alt="" />
            <span class="mind-document-list-label">{{ stripAmindExtension(document.label) }}</span>
            <span v-if="document.isDirty" class="mind-document-dirty" aria-label="有未保存修改"></span>
          </button>
          <div v-if="!documents.length" class="mind-document-list-empty">暂无打开的文档</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const mindIcon = 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/mind_full.svg';

type MindDocumentTabItem = {
  docId: string;
  label: string;
  isDirty: boolean;
  isSaving: boolean;
};

const props = defineProps<{
  documents: MindDocumentTabItem[];
  activeDocId: string | null;
}>();

const emit = defineEmits<{
  (event: 'activate', docId: string): void;
  (event: 'close', docId: string): void;
  (event: 'new'): void;
}>();

const barRef = ref<HTMLElement | null>(null);
const tabsRef = ref<HTMLElement | null>(null);
const newTabButtonRef = ref<HTMLElement | null>(null);
const tabRefs = new Map<string, HTMLElement>();
const listOpen = ref(false);

function stripAmindExtension(label: string) {
  return label.replace(/\.amind$/iu, '') || '思维导图';
}

function setTabRef(docId: string, element: Element | null) {
  if (element instanceof HTMLElement) tabRefs.set(docId, element);
  else tabRefs.delete(docId);
}

function revealActiveTab() {
  if (!props.activeDocId) return;
  void nextTick(() => {
    const activeDocId = props.activeDocId || '';
    tabRefs.get(activeDocId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (props.documents.at(-1)?.docId === activeDocId) {
      newTabButtonRef.value?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
}

function onTabsWheel(event: WheelEvent) {
  const container = tabsRef.value;
  if (!container || container.scrollWidth <= container.clientWidth) return;
  const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  container.scrollLeft += delta;
}

function activateFromList(docId: string) {
  listOpen.value = false;
  emit('activate', docId);
}

function onWindowPointerDown(event: PointerEvent) {
  if (!listOpen.value || barRef.value?.contains(event.target as Node)) return;
  listOpen.value = false;
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') listOpen.value = false;
}

watch(() => props.activeDocId, revealActiveTab);
watch(() => props.documents.length, () => {
  if (!props.documents.length) listOpen.value = false;
  revealActiveTab();
});

onMounted(() => {
  window.addEventListener('pointerdown', onWindowPointerDown, true);
  window.addEventListener('keydown', onWindowKeyDown, true);
  revealActiveTab();
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onWindowPointerDown, true);
  window.removeEventListener('keydown', onWindowKeyDown, true);
});
</script>

<style scoped lang="scss">
.mind-document-bar {
  position: relative;
  z-index: 30;
  height: 30px;
  flex: 0 0 30px;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  padding: 0 10px;
  -webkit-app-region: no-drag;
}

.mind-document-tabs {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.mind-document-tabs::-webkit-scrollbar {
  display: none;
}

.mind-document-tab {
  height: 25px;
  flex: 0 1 172px;
  min-width: 104px;
  max-width: 196px;
  padding: 0 6px 0 9px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  background: transparent;
  color: rgba(23, 32, 51, 0.66);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.mind-document-tab:hover {
  background: rgba(255, 255, 255, 0.5);
  color: #172033;
}

.mind-document-tab.is-active {
  height: 27px;
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.2);
  color: #172033;
}

.mind-document-tab:first-child.is-active {
  border-left: 0;
}

.mind-document-icon,
.mind-document-list-icon {
  width: 16px;
  height: 13px;
  flex: 0 0 auto;
  display: block;
  object-fit: contain;
}

.mind-document-label,
.mind-document-list-label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0;
}

.mind-document-dirty {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #e3a020;
}

.mind-document-saving {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border: 1.5px solid rgba(100, 116, 139, 0.3);
  border-top-color: #64748b;
  border-radius: 50%;
  animation: mind-document-saving-spin 0.72s linear infinite;
}

.mind-document-close {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  color: #697386;
  font-size: 15px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.12s ease, background-color 0.12s ease, color 0.12s ease;
}

.mind-document-tab:hover .mind-document-close,
.mind-document-tab.is-active .mind-document-close {
  opacity: 0.78;
}

.mind-document-close:hover {
  background: rgba(100, 116, 139, 0.14);
  color: #172033;
  opacity: 1;
}

.mind-document-tool {
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  margin: 0 0 1px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #657185;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.mind-document-new {
  width: 23px;
  height: 23px;
  flex: 0 0 23px;
  margin-bottom: 2px;
  border-radius: 5px;
}

.mind-document-tool:hover,
.mind-document-tool.is-active {
  background: rgba(255, 255, 255, 0.72);
  color: #172033;
}

.mind-document-plus {
  position: relative;
  width: 12px;
  height: 12px;
}

.mind-document-plus::before,
.mind-document-plus::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 1px;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.mind-document-plus::before {
  width: 12px;
  height: 1.5px;
}

.mind-document-plus::after {
  width: 1.5px;
  height: 12px;
}

.mind-document-chevron {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
}

.mind-document-list-shell {
  position: relative;
  flex: 0 0 auto;
}

.mind-document-list {
  position: absolute;
  z-index: 200;
  top: 29px;
  right: 0;
  width: 236px;
  max-height: min(360px, calc(100vh - 110px));
  overflow-y: auto;
  padding: 6px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
}

.mind-document-list-header {
  height: 28px;
  padding: 0 7px;
  color: #778195;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.mind-document-list-item {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #465166;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.mind-document-list-item:hover,
.mind-document-list-item.is-active {
  background: #f0f3f5;
  color: #172033;
}

.mind-document-list-empty {
  padding: 18px 10px;
  color: #8a94a6;
  text-align: center;
  font-size: 12px;
}

.mind-document-list-enter-active,
.mind-document-list-leave-active {
  transition: opacity 0.13s ease, transform 0.13s ease;
  transform-origin: top right;
}

.mind-document-list-enter-from,
.mind-document-list-leave-to {
  opacity: 0;
  transform: translateY(-3px) scale(0.985);
}

@keyframes mind-document-saving-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .mind-document-tab {
    flex-basis: 142px;
    min-width: 92px;
  }
}
</style>
