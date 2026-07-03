<template>
  <Teleport to="body">
  <div class="vibe-converge-settings">
    <button class="vcs-trigger" type="button" title="知识库收敛设置" aria-label="知识库收敛设置" @click="toggle">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    </button>

    <section v-if="open" class="vcs-panel">
      <header class="vcs-head">
        <div>
          <h2>知识库收敛设置</h2>
          <p>{{ subtitle }}</p>
        </div>
        <button type="button" class="vcs-close" aria-label="关闭" @click="open = false">×</button>
      </header>

      <div class="vcs-body">
        <p v-if="!isAdmin" class="vcs-readonly">只读 · 仅管理员（a80646）可修改</p>

        <label class="vcs-check">
          <input v-model="draft.auto_enabled" type="checkbox" :disabled="!isAdmin" />
          <span>自动收敛总开关<small>关掉后所有自动收敛触发都跳过</small></span>
        </label>

        <label class="vcs-field">
          <span>每日全量收敛时刻<small>HH:MM，每天这个点跑一次全量（兜底 + scrub）</small></span>
          <input v-model="draft.full_run_time" :disabled="!isAdmin" placeholder="01:00" />
        </label>

        <label class="vcs-field">
          <span>增量收敛累计阈值 N<small>一个项目累计 N 条新录入后，触发一次增量收敛</small></span>
          <input v-model.number="draft.dedup_threshold_n" type="number" min="1" :disabled="!isAdmin" />
        </label>

        <label class="vcs-check">
          <input v-model="draft.inline_converge" type="checkbox" :disabled="!isAdmin" />
          <span>阈值增量内联可见<small>内联 = 对话框当场看到收敛（会等几秒）</small></span>
        </label>

        <label class="vcs-field">
          <span>陈旧度告警阈值（小时）<small>最老未收敛事实超过此小时数 → 健康页标告警</small></span>
          <input v-model.number="draft.staleness_alarm_hours" type="number" min="1" :disabled="!isAdmin" />
        </label>
      </div>

      <footer class="vcs-footer">
        <span :class="['vcs-status', { ok: statusOk === true, error: statusOk === false }]">{{ statusText }}</span>
        <button type="button" :disabled="!isAdmin || saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
      </footer>
    </section>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getConvergeConfig, updateConvergeConfig, type ConvergeConfig } from './api'

const open = ref(false)
const saving = ref(false)
const isAdmin = ref(false)
const statusText = ref('就绪')
const statusOk = ref<boolean | null>(null)
const updatedAt = ref<string | null>(null)

type ConvergeDraft = Pick<ConvergeConfig,
  'auto_enabled' | 'full_run_time' | 'dedup_threshold_n' | 'inline_converge' | 'staleness_alarm_hours'>

const draft = reactive<ConvergeDraft>({
  auto_enabled: true,
  full_run_time: '01:00',
  dedup_threshold_n: 10,
  inline_converge: true,
  staleness_alarm_hours: 48,
})

const subtitle = computed(() =>
  updatedAt.value ? `上次更新 ${new Date(updatedAt.value).toLocaleString()}` : '每日自动收敛参数')

watch(open, (value) => {
  if (value) load()
})

onMounted(load)

async function load() {
  try {
    const c = await getConvergeConfig()
    isAdmin.value = !!c.is_admin
    updatedAt.value = c.updated_at ?? null
    Object.assign(draft, {
      auto_enabled: c.auto_enabled,
      full_run_time: c.full_run_time,
      dedup_threshold_n: c.dedup_threshold_n,
      inline_converge: c.inline_converge,
      staleness_alarm_hours: c.staleness_alarm_hours,
    })
    statusText.value = '就绪'
    statusOk.value = null
  } catch (error: any) {
    statusText.value = `读取失败：${error?.message || String(error)}`
    statusOk.value = false
  }
}

async function save() {
  if (!isAdmin.value) return
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(draft.full_run_time).trim())) {
    statusText.value = '时刻需 HH:MM（00:00~23:59）'
    statusOk.value = false
    return
  }
  if (!(draft.dedup_threshold_n >= 1) || !(draft.staleness_alarm_hours >= 1)) {
    statusText.value = '阈值需 ≥ 1'
    statusOk.value = false
    return
  }
  saving.value = true
  try {
    const c = await updateConvergeConfig({ ...draft })
    updatedAt.value = c.updated_at ?? null
    statusText.value = '已保存'
    statusOk.value = true
  } catch (error: any) {
    statusText.value = `保存失败：${error?.message || String(error)}`
    statusOk.value = false
  } finally {
    saving.value = false
  }
}

function toggle() {
  open.value = !open.value
}
</script>

<style scoped lang="scss">
.vibe-converge-settings {
  position: fixed;
  right: 22px;
  bottom: 70px;
  z-index: 80;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

.vcs-trigger {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(15, 15, 15, 0.1);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(18px);
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
    stroke: #242426;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.vcs-panel {
  position: absolute;
  right: 0;
  bottom: 48px;
  width: min(420px, calc(100vw - 44px));
  max-height: min(600px, calc(100vh - 110px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 18px;
  background: rgba(250, 250, 249, 0.96);
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(24px) saturate(140%);
}

.vcs-head,
.vcs-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(15, 15, 15, 0.07);

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: rgba(15, 15, 15, 0.55);
  }
}

.vcs-close,
.vcs-footer button {
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 9px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12px;
  height: 30px;
  padding: 0 12px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.vcs-close {
  width: 30px;
  padding: 0;
  font-size: 18px;
}

.vcs-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vcs-readonly {
  margin: 0;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(180, 35, 24, 0.07);
  color: #b42318;
  font-size: 12px;
}

.vcs-field {
  display: block;

  > span {
    display: block;
    margin: 0 0 5px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(15, 15, 15, 0.72);

    small {
      display: block;
      margin-top: 2px;
      font-weight: 400;
      font-size: 11px;
      color: rgba(15, 15, 15, 0.5);
    }
  }

  input {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
    border: 1px solid rgba(15, 15, 15, 0.1);
    border-radius: 9px;
    background: #fff;
    padding: 0 9px;
    color: #1d1d1f;
    font-size: 12px;
    outline: none;

    &:focus {
      border-color: rgba(47, 116, 65, 0.46);
      box-shadow: 0 0 0 3px rgba(47, 116, 65, 0.08);
    }

    &:disabled {
      background: rgba(15, 15, 15, 0.03);
      color: rgba(15, 15, 15, 0.5);
    }
  }
}

.vcs-check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 12px;
  color: rgba(15, 15, 15, 0.72);

  input {
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }

  span {
    font-weight: 600;

    small {
      display: block;
      margin-top: 2px;
      font-weight: 400;
      font-size: 11px;
      color: rgba(15, 15, 15, 0.5);
    }
  }
}

.vcs-footer {
  border-bottom: 0;
  border-top: 1px solid rgba(15, 15, 15, 0.07);
}

.vcs-status {
  min-width: 0;
  color: rgba(15, 15, 15, 0.55);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.ok { color: #2f7441; }
  &.error { color: #b42318; }
}
</style>
