<template>
  <Teleport to="body">
    <Transition
      name="project-switch-dialog-fade"
      @after-enter="focusInitialControl"
      @after-leave="restoreFocus"
    >
      <div
        v-if="visible"
        class="project-switch-dialog-backdrop"
        @click.self="requestClose"
      >
        <section
          ref="dialogRef"
          id="project-switch-dialog"
          class="project-switch-dialog"
          :class="{
            'is-working': busy,
            'is-refreshing': listRefreshing,
            'is-error': (!!displayError || !!displayProjectListError) && !interactionLocked,
          }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          :aria-busy="interactionLocked ? 'true' : undefined"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <header class="project-switch-dialog-head">
            <div class="project-switch-dialog-heading">
              <span class="project-switch-dialog-eyebrow">PROJECT</span>
              <h2 :id="titleId">选择项目</h2>
            </div>
            <button
              class="project-switch-dialog-close"
              type="button"
              aria-label="关闭项目选择"
              title="关闭"
              :disabled="busy"
              @click="requestClose"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <p :id="descriptionId" class="project-switch-dialog-description">
            选择一个项目以打开对应的对话与知识库。
          </p>

          <div v-if="busy" class="project-switch-dialog-working" role="status" aria-live="polite">
            <!-- ThinkingOrbStatus uses the shared thinking-orbs renderer.  The
                 explicit working state keeps this host on the shared motion
                 path while preserving the conversation component's default. -->
            <ThinkingOrbStatus
              :key="busy ? 'working' : 'idle'"
              class="project-switch-dialog-orb"
              state="working"
              label="Working"
              aria-label="正在切换项目"
              data-orb-state="working"
            />
            <span class="project-switch-dialog-working-copy">
              <strong>正在切换项目…</strong>
              <small>{{ targetLabel || '正在准备项目数据' }}</small>
            </span>
          </div>

          <div v-else-if="listRefreshing" class="project-switch-dialog-working" role="status" aria-live="polite">
            <ThinkingOrbStatus
              class="project-switch-dialog-orb"
              state="working"
              label="Working"
              aria-label="项目列表加载中"
            />
            <span class="project-switch-dialog-working-copy">
              <strong>项目列表加载中…</strong>
              <small>正在获取最新可用项目</small>
            </span>
          </div>

          <div v-if="displayError && !interactionLocked" class="project-switch-dialog-error" role="alert" aria-live="assertive">
            <span class="project-switch-dialog-error-mark" aria-hidden="true">!</span>
            <span class="project-switch-dialog-error-copy">{{ displayError }}</span>
          </div>

          <div v-else-if="displayProjectListError && !interactionLocked" class="project-switch-dialog-error" role="alert" aria-live="assertive">
            <span class="project-switch-dialog-error-mark" aria-hidden="true">!</span>
            <span class="project-switch-dialog-error-copy">{{ displayProjectListError }}</span>
          </div>

          <div v-if="listRefreshing && !normalizedProjects.length" class="project-switch-dialog-skeleton" aria-hidden="true">
            <span v-for="index in 3" :key="index" class="project-switch-dialog-skeleton-row" />
          </div>

          <div v-else-if="!normalizedProjects.length" class="project-switch-dialog-empty" role="status">
            <strong>暂无可用项目</strong>
            <span>请确认当前账号已加入项目后重试。</span>
          </div>

          <ul
            v-else
            class="project-switch-dialog-list"
            role="listbox"
            aria-label="项目列表"
            :aria-disabled="interactionLocked ? 'true' : undefined"
            :aria-busy="interactionLocked ? 'true' : undefined"
          >
            <li v-for="project in normalizedProjects" :key="project.key" class="project-switch-dialog-item" role="presentation">
              <button
                :ref="element => setOptionRef(project.key, element)"
                class="project-switch-dialog-option"
                :class="{
                  'is-current': project.key === currentId,
                  'is-target': project.key === targetId,
                }"
                type="button"
                role="option"
                :aria-selected="project.key === activeOptionId"
                :aria-label="project.hint ? `${project.label}，${project.hint}` : project.label"
                :disabled="interactionLocked || project.disabled"
                @click="chooseProject(project.raw)"
              >
                <span class="project-switch-dialog-option-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                    <path d="M3 12A9 3 0 0 0 21 12" />
                  </svg>
                </span>
                <span class="project-switch-dialog-option-copy">
                  <strong>{{ project.label }}</strong>
                  <small v-if="project.hint">{{ project.hint }}</small>
                </span>
                <span v-if="project.key === currentId" class="project-switch-dialog-current">当前</span>
                <span v-else-if="project.key === targetId && busy" class="project-switch-dialog-pending" aria-hidden="true" />
                <svg v-else class="project-switch-dialog-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </li>
          </ul>

          <footer class="project-switch-dialog-foot">
            <span v-if="busy" class="project-switch-dialog-lock" aria-live="polite">加载完成前无法关闭</span>
            <span v-else-if="listRefreshing" class="project-switch-dialog-lock" aria-live="polite">项目列表刷新中，Esc 可关闭</span>
            <span v-else class="project-switch-dialog-hint">使用 ↑ ↓ 选择，Enter 确认，Esc 关闭</span>
            <button
              v-if="displayError && !interactionLocked"
              class="project-switch-dialog-retry"
              type="button"
              :disabled="interactionLocked"
              @click="retry"
            >
              重试
            </button>
            <button
              v-else-if="displayProjectListError && !interactionLocked"
              class="project-switch-dialog-retry"
              type="button"
              :disabled="interactionLocked"
              @click="refreshProjects"
            >
              重试刷新
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ThinkingOrbStatus from './ThinkingOrbStatus.vue'
import {
  projectIdentity,
  type ProjectSwitchPhase,
  type ProjectIdentityLike,
} from '../projectSwitchDialogPolicy'

export interface ProjectSwitchDialogProject {
  id?: string | number
  project_id?: string | number
  value?: string | number
  name?: string
  project_name?: string
  label?: string
  description?: string
  hint?: string
  owner_name?: string
  creator_name?: string
  disabled?: boolean
  [key: string]: unknown
}

interface NormalizedProject {
  key: string
  label: string
  hint: string
  disabled: boolean
  raw: ProjectSwitchDialogProject
}

const props = withDefaults(defineProps<{
  modelValue?: boolean
  /** `open` is a convenience alias for hosts that do not use v-model. */
  open?: boolean
  projects: readonly ProjectSwitchDialogProject[]
  phase?: ProjectSwitchPhase
  loading?: boolean
  error?: string
  projectsLoading?: boolean
  projectListError?: string
  /** Current committed project. */
  currentProjectId?: ProjectIdentityLike
  selectedProjectId?: ProjectIdentityLike
  /** Project whose request is currently being resolved. */
  targetProjectId?: ProjectIdentityLike
  targetProject?: ProjectSwitchDialogProject | null
}>(), {
  modelValue: undefined,
  open: undefined,
  phase: 'idle',
  loading: false,
  error: '',
  projectsLoading: false,
  projectListError: '',
  currentProjectId: '',
  selectedProjectId: '',
  targetProjectId: '',
  targetProject: null,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  /** Mirrors AppSelect: the canonical selection payload is the project id. */
  (event: 'select', projectId: string | number): void
  /** Alias for hosts that prefer an explicit event name (full row payload). */
  (event: 'select-project', project: ProjectSwitchDialogProject): void
  (event: 'retry', project?: ProjectSwitchDialogProject | null): void
  (event: 'refresh'): void
  (event: 'close'): void
}>()

const instance = getCurrentInstance()
const uid = instance?.uid ?? Math.floor(Math.random() * 1_000_000)
const titleId = `project-switch-dialog-title-${uid}`
const descriptionId = `project-switch-dialog-description-${uid}`
const dialogRef = ref<HTMLElement | null>(null)
const optionRefs = new Map<string, HTMLButtonElement>()
let restoreElement: HTMLElement | null = null

const visible = computed(() => props.modelValue ?? props.open ?? false)
const busy = computed(() => props.loading || props.phase === 'working')
const listRefreshing = computed(() => props.projectsLoading)
const interactionLocked = computed(() => busy.value || listRefreshing.value)
const currentId = computed(() => projectIdentity(props.currentProjectId || props.selectedProjectId))
const targetId = computed(() => projectIdentity(
  props.targetProjectId || props.targetProject?.id || props.targetProject?.project_id || '',
))
const activeOptionId = computed(() => targetId.value || currentId.value)
const targetLabel = computed(() => {
  if (props.targetProject) return projectLabel(props.targetProject)
  return normalizedProjects.value.find(item => item.key === targetId.value)?.label || ''
})
const displayError = computed(() => String(props.error || '').trim())
const displayProjectListError = computed(() => String(props.projectListError || '').trim())

const normalizedProjects = computed<NormalizedProject[]>(() => (props.projects || [])
  .map((raw) => {
    const key = projectIdentity(raw)
    if (!key) return null
    return {
      key,
      label: projectLabel(raw),
      hint: projectHint(raw),
      disabled: raw.disabled === true,
      raw,
    }
  })
  .filter((item): item is NormalizedProject => !!item))

function projectLabel(project: ProjectSwitchDialogProject | null | undefined): string {
  return String(
    project?.label
      || project?.name
      || project?.project_name
      || (project?.id != null ? `项目 ${project.id}` : '未命名项目'),
  ).trim()
}

function projectHint(project: ProjectSwitchDialogProject): string {
  return String(
    project.hint
      || project.description
      || project.owner_name
      || project.creator_name
      || '',
  ).trim()
}

function setOptionRef(key: string, element: unknown) {
  if (element instanceof HTMLButtonElement) optionRefs.set(key, element)
  else optionRefs.delete(key)
}

function enabledOptionElements(): HTMLButtonElement[] {
  return normalizedProjects.value
    .map(project => optionRefs.get(project.key))
    .filter((element): element is HTMLButtonElement => !!element && !element.disabled)
}

function focusInitialControl() {
  const options = enabledOptionElements()
  const preferred = options.find((element) => {
    const key = Array.from(optionRefs.entries()).find(([, value]) => value === element)?.[0]
    return key === targetId.value || key === currentId.value
  })
  ;(preferred || options[0] || dialogRef.value)?.focus()
}

function restoreFocus() {
  const element = restoreElement
  restoreElement = null
  if (element && element.isConnected) element.focus()
}

function requestClose() {
  if (busy.value) return
  emit('update:modelValue', false)
  emit('close')
}

function chooseProject(project: ProjectSwitchDialogProject) {
  if (interactionLocked.value || project.disabled) return
  const rawId = project.id ?? project.project_id ?? project.value
  emit('select', typeof rawId === 'number' ? rawId : String(rawId ?? '').trim())
  emit('select-project', project)
}

function retry() {
  if (interactionLocked.value) return
  const project = props.targetProject
    || normalizedProjects.value.find(item => item.key === targetId.value)?.raw
    || null
  emit('retry', project)
}

function refreshProjects() {
  if (interactionLocked.value) return
  emit('refresh')
}

function moveOptionFocus(delta: number) {
  const options = enabledOptionElements()
  if (!options.length) return
  const active = document.activeElement as HTMLButtonElement | null
  const current = active ? options.indexOf(active) : -1
  const next = current < 0
    ? (delta > 0 ? 0 : options.length - 1)
    : (current + delta + options.length) % options.length
  options[next]?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    if (!interactionLocked.value) moveOptionFocus(1)
    return
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    if (!interactionLocked.value) moveOptionFocus(-1)
    return
  }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    if (!interactionLocked.value) {
      const options = enabledOptionElements()
      ;(event.key === 'Home' ? options[0] : options[options.length - 1])?.focus()
    }
    return
  }
  if (event.key !== 'Tab') return
  const focusables = [
    ...enabledOptionElements(),
    ...((displayError.value || displayProjectListError.value) && !interactionLocked.value
      ? [dialogRef.value?.querySelector<HTMLButtonElement>('.project-switch-dialog-retry')]
      : []),
    ...(!busy.value ? [dialogRef.value?.querySelector<HTMLButtonElement>('.project-switch-dialog-close')] : []),
  ].filter((element): element is HTMLButtonElement => !!element && !element.disabled)
  if (!focusables.length) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }
  const current = focusables.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.shiftKey
    ? (current <= 0 ? focusables.length - 1 : current - 1)
    : (current < 0 || current === focusables.length - 1 ? 0 : current + 1)
  event.preventDefault()
  focusables[next]?.focus()
}

watch(visible, async (next, previous) => {
  if (next && !previous) {
    restoreElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    focusInitialControl()
  } else if (!next && previous) {
    // The transition callback restores focus after the leave animation.  Keep
    // this watcher intentionally side-effect free while the dialog is mounted.
  }
})

watch(interactionLocked, async (next, previous) => {
  if (next && !previous) {
    // The clicked option is disabled as soon as the request starts. Move focus
    // to the dialog itself so keyboard users do not land on a locked control.
    await nextTick()
    dialogRef.value?.focus()
  } else if (!next && previous && visible.value) {
    await nextTick()
    focusInitialControl()
  }
})

onBeforeUnmount(() => {
  optionRefs.clear()
  restoreFocus()
})
</script>

<style scoped lang="scss">
.project-switch-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: grid;
  place-items: center;
  padding: 20px;
  box-sizing: border-box;
  background: rgba(15, 15, 15, 0.34);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
}

.project-switch-dialog {
  width: min(520px, calc(100vw - 32px));
  max-height: min(700px, calc(100vh - 40px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid rgba(15, 15, 15, 0.11);
  border-radius: 18px;
  background: #fbfbfb;
  color: rgba(15, 15, 15, 0.86);
  box-shadow: 0 26px 70px rgba(15, 15, 15, 0.18), 0 4px 14px rgba(15, 15, 15, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', sans-serif;
  outline: none;
}

.project-switch-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 0;
}

.project-switch-dialog-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: rgba(15, 15, 15, 0.38);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.project-switch-dialog-heading h2 {
  margin: 0;
  color: rgba(15, 15, 15, 0.9);
  font-size: 21px;
  font-weight: 620;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.project-switch-dialog-close {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: transparent;
  color: rgba(15, 15, 15, 0.42);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.project-switch-dialog-close:hover:not(:disabled) {
  background: rgba(15, 15, 15, 0.065);
  color: rgba(15, 15, 15, 0.8);
}

.project-switch-dialog-close:focus-visible,
.project-switch-dialog-option:focus-visible,
.project-switch-dialog-retry:focus-visible {
  outline: 2px solid rgba(15, 15, 15, 0.44);
  outline-offset: 2px;
}

.project-switch-dialog-close svg {
  width: 16px;
  height: 16px;
}

.project-switch-dialog-description {
  margin: 7px 24px 0;
  color: rgba(15, 15, 15, 0.52);
  font-size: 13px;
  line-height: 1.55;
}

.project-switch-dialog-working {
  min-height: 58px;
  margin: 18px 24px 0;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  border: 1px solid rgba(15, 15, 15, 0.09);
  border-radius: 12px;
  background: rgba(15, 15, 15, 0.035);
}

.project-switch-dialog-orb {
  flex: 0 0 auto;
  margin: 0 !important;
}

.project-switch-dialog-working-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-switch-dialog-working-copy strong {
  color: rgba(15, 15, 15, 0.78);
  font-size: 13px;
  font-weight: 600;
}

.project-switch-dialog-working-copy small {
  overflow: hidden;
  color: rgba(15, 15, 15, 0.42);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-switch-dialog-error {
  margin: 14px 24px 0;
  padding: 9px 11px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid rgba(15, 15, 15, 0.14);
  border-radius: 10px;
  background: rgba(15, 15, 15, 0.045);
  color: rgba(15, 15, 15, 0.74);
  font-size: 12px;
  line-height: 1.5;
}

.project-switch-dialog-error-mark {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid currentColor;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
}

.project-switch-dialog-error-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.project-switch-dialog-list {
  min-height: 0;
  max-height: min(390px, 48vh);
  overflow-y: auto;
  margin: 18px 14px 0;
  padding: 0 10px;
  list-style: none;
  overscroll-behavior: contain;
}

.project-switch-dialog-item + .project-switch-dialog-item {
  margin-top: 5px;
}

.project-switch-dialog-option {
  width: 100%;
  min-height: 58px;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}

.project-switch-dialog-option:hover:not(:disabled) {
  border-color: rgba(15, 15, 15, 0.1);
  background: rgba(15, 15, 15, 0.042);
}

.project-switch-dialog-option.is-current {
  border-color: rgba(15, 15, 15, 0.1);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 3px 12px rgba(15, 15, 15, 0.055);
}

.project-switch-dialog-option:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.project-switch-dialog-option-icon {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: inline-grid;
  place-items: center;
  align-items: center;
  justify-items: center;
  line-height: 0;
  background: rgba(15, 15, 15, 0.06);
  color: rgba(15, 15, 15, 0.68);
}

.project-switch-dialog-option-icon svg {
  display: block;
  width: 17px;
  height: 17px;
  margin: 0;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.project-switch-dialog-option-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-switch-dialog-option-copy strong {
  overflow: hidden;
  color: rgba(15, 15, 15, 0.8);
  font-size: 13px;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-switch-dialog-option-copy small {
  overflow: hidden;
  color: rgba(15, 15, 15, 0.42);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-switch-dialog-current {
  flex: 0 0 auto;
  color: rgba(15, 15, 15, 0.45);
  font-size: 11px;
}

.project-switch-dialog-arrow {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  color: rgba(15, 15, 15, 0.3);
}

.project-switch-dialog-pending {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border: 1.5px solid rgba(15, 15, 15, 0.36);
  border-top-color: transparent;
  border-radius: 50%;
  animation: project-switch-dialog-spin 700ms linear infinite;
}

.project-switch-dialog-skeleton {
  margin: 18px 24px 8px;
  display: grid;
  gap: 5px;
}

.project-switch-dialog-skeleton-row {
  height: 58px;
  border: 1px solid rgba(15, 15, 15, 0.055);
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(15, 15, 15, 0.025), rgba(15, 15, 15, 0.055), rgba(15, 15, 15, 0.025));
}

.project-switch-dialog-empty {
  margin: 22px 24px 8px;
  padding: 28px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  border: 1px dashed rgba(15, 15, 15, 0.13);
  border-radius: 12px;
  color: rgba(15, 15, 15, 0.5);
  text-align: center;
}

.project-switch-dialog-empty strong {
  color: rgba(15, 15, 15, 0.68);
  font-size: 13px;
  font-weight: 600;
}

.project-switch-dialog-empty span {
  font-size: 12px;
}

.project-switch-dialog-foot {
  min-height: 50px;
  margin-top: 10px;
  padding: 12px 24px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid rgba(15, 15, 15, 0.065);
}

.project-switch-dialog-hint,
.project-switch-dialog-lock {
  min-width: 0;
  color: rgba(15, 15, 15, 0.36);
  font-size: 11px;
  line-height: 1.4;
}

.project-switch-dialog-lock {
  color: rgba(15, 15, 15, 0.48);
}

.project-switch-dialog-retry {
  flex: 0 0 auto;
  min-width: 58px;
  min-height: 30px;
  padding: 4px 12px;
  border: 1px solid rgba(15, 15, 15, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.84);
  color: rgba(15, 15, 15, 0.74);
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
}

.project-switch-dialog-retry:hover:not(:disabled) {
  border-color: rgba(15, 15, 15, 0.3);
  background: rgba(15, 15, 15, 0.055);
}

.project-switch-dialog-fade-enter-active,
.project-switch-dialog-fade-leave-active {
  transition: opacity 180ms ease;
}

.project-switch-dialog-fade-enter-active .project-switch-dialog,
.project-switch-dialog-fade-leave-active .project-switch-dialog {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
}

.project-switch-dialog-fade-enter-from,
.project-switch-dialog-fade-leave-to {
  opacity: 0;
}

.project-switch-dialog-fade-enter-from .project-switch-dialog,
.project-switch-dialog-fade-leave-to .project-switch-dialog {
  opacity: 0;
  transform: translateY(9px) scale(0.985);
}

@keyframes project-switch-dialog-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .project-switch-dialog-backdrop { padding: 12px; }
  .project-switch-dialog { width: min(520px, calc(100vw - 24px)); }
  .project-switch-dialog-head { padding-left: 18px; padding-right: 18px; }
  .project-switch-dialog-description { margin-left: 18px; margin-right: 18px; }
  .project-switch-dialog-working,
  .project-switch-dialog-error,
  .project-switch-dialog-skeleton,
  .project-switch-dialog-empty { margin-left: 18px; margin-right: 18px; }
  .project-switch-dialog-list { margin-left: 8px; margin-right: 8px; padding-left: 6px; padding-right: 6px; }
  .project-switch-dialog-foot { padding-left: 18px; padding-right: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .project-switch-dialog-fade-enter-active,
  .project-switch-dialog-fade-leave-active,
  .project-switch-dialog-fade-enter-active .project-switch-dialog,
  .project-switch-dialog-fade-leave-active .project-switch-dialog {
    transition: opacity 80ms linear;
  }

  .project-switch-dialog-fade-enter-from .project-switch-dialog,
  .project-switch-dialog-fade-leave-to .project-switch-dialog {
    transform: none;
  }

  .project-switch-dialog-pending { animation: none; }
}
</style>
