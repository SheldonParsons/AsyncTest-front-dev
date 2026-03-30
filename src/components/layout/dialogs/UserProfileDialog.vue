<template>
  <AstDialog
    ref="dialogRef"
    title=""
    bgtype="white"
    topMove="0 !important"
    :showCancel="false"
    :showComfirm="false"
  >
    <div class="profile-sheet">
      <div class="profile-sheet__hero">
        <div class="profile-sheet__identity">
          <div class="profile-sheet__avatar-wrap">
            <el-avatar :size="72" :src="userAvatar" class="profile-sheet__avatar" />
          </div>

          <div class="profile-sheet__headline">
            <div class="profile-sheet__eyebrow">PROFILE</div>
            <h2 class="profile-sheet__name">{{ profile.nick_name || profile.username || '未命名用户' }}</h2>
            <div class="profile-sheet__subline">@{{ profile.username || '--' }}</div>
          </div>
        </div>

        <div class="profile-sheet__summary">
          <div class="profile-sheet__summary-item">
            <span class="profile-sheet__summary-label">最近登录</span>
            <span class="profile-sheet__summary-value">{{ formatDateTime(profile.last_login) }}</span>
          </div>
          <div class="profile-sheet__summary-item">
            <span class="profile-sheet__summary-label">注册时间</span>
            <span class="profile-sheet__summary-value">{{ formatDateTime(profile.date_joined || profile.add_time) }}</span>
          </div>
        </div>
      </div>

      <div class="profile-sheet__content" v-loading="loading">
        <section class="profile-card profile-card--readonly">
          <div class="profile-card__header">
            <div>
              <p class="profile-card__kicker">Account</p>
              <h3 class="profile-card__title">账户信息</h3>
            </div>
          </div>

          <div class="profile-readonly-grid">
            <div class="profile-readonly-item">
              <span class="profile-readonly-item__label">用户名</span>
              <span class="profile-readonly-item__value">{{ profile.username || '--' }}</span>
            </div>
            <div class="profile-readonly-item">
              <span class="profile-readonly-item__label">状态</span>
              <span class="profile-readonly-item__value">{{ profile.is_active ? '正常' : '已停用' }}</span>
            </div>
            <div class="profile-readonly-item">
              <span class="profile-readonly-item__label">员工标识</span>
              <span class="profile-readonly-item__value">{{ profile.is_staff ? '是' : '否' }}</span>
            </div>
            <div class="profile-readonly-item">
              <span class="profile-readonly-item__label">超级管理员</span>
              <span class="profile-readonly-item__value">{{ profile.is_superuser ? '是' : '否' }}</span>
            </div>
          </div>
        </section>

        <section class="profile-card">
          <div class="profile-card__header">
            <div>
              <p class="profile-card__kicker">Editable</p>
              <h3 class="profile-card__title">个人资料</h3>
            </div>
            <p class="profile-card__hint">仅可修改昵称、邮箱、手机号和性别</p>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="formRules"
            label-position="top"
            class="profile-form"
            @submit.prevent
          >
            <div class="profile-form__grid">
              <el-form-item label="昵称" prop="nick_name">
                <el-input v-model="form.nick_name" maxlength="40" placeholder="请输入昵称" />
              </el-form-item>

              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" maxlength="100" placeholder="请输入邮箱" />
              </el-form-item>

              <el-form-item label="手机号" prop="mobile">
                <el-input v-model="form.mobile" maxlength="20" placeholder="请输入手机号" />
              </el-form-item>

              <el-form-item label="性别" prop="sex">
                <el-radio-group v-model="form.sex" class="profile-form__radio-group">
                  <el-radio :value="1">男</el-radio>
                  <el-radio :value="2">女</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>
          </el-form>
        </section>
      </div>

      <div class="profile-sheet__footer">
        <button class="profile-btn profile-btn--ghost" @click="close">关闭</button>
        <button class="profile-btn profile-btn--secondary" :disabled="loading || saving || !dirty" @click="resetForm">
          重置
        </button>
        <button class="profile-btn profile-btn--primary" :disabled="loading || saving || !dirty" @click="submitForm">
          {{ saving ? '保存中...' : '保存资料' }}
        </button>
      </div>
    </div>
  </AstDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import AstDialog from '@/components/common/general/dialog.vue'
import { http } from '@/utils/http'

type UserProfile = {
  id: number | null;
  username: string;
  nick_name: string;
  email: string;
  mobile: string;
  sex: number;
  last_login: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  add_time: string;
}

type UserProfileForm = Pick<UserProfile, 'nick_name' | 'email' | 'mobile' | 'sex'>

type UserProfileResponse = {
  result: number;
  msg: string;
  data?: Partial<UserProfile>;
}

const emit = defineEmits<{
  updated: [profile: UserProfile]
}>()

const dialogRef = ref<InstanceType<typeof AstDialog> | null>(null)
const formRef = ref<FormInstance | null>(null)
const loading = ref(false)
const saving = ref(false)

const profile = reactive<UserProfile>({
  id: null,
  username: '',
  nick_name: '',
  email: '',
  mobile: '',
  sex: 0,
  last_login: '',
  is_superuser: false,
  is_staff: false,
  is_active: true,
  date_joined: '',
  add_time: '',
})

const form = reactive<UserProfileForm>({
  nick_name: '',
  email: '',
  mobile: '',
  sex: 0,
})

const initialForm = ref<UserProfileForm>({
  nick_name: '',
  email: '',
  mobile: '',
  sex: 0,
})

const formRules: FormRules<UserProfileForm> = {
  nick_name: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 40, message: '昵称长度需在 1-40 个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { min: 6, max: 20, message: '手机号长度需在 6-20 个字符之间', trigger: 'blur' },
  ],
  sex: [{ required: true, message: '请选择性别', trigger: 'change' }],
}

const dirty = computed(() =>
  form.nick_name !== initialForm.value.nick_name ||
  form.email !== initialForm.value.email ||
  form.mobile !== initialForm.value.mobile ||
  form.sex !== initialForm.value.sex
)

const userAvatar = computed(() => {
  const userId = profile.id ?? 99
  return `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${userId}.png`
})

function normalizeProfile(payload?: Partial<UserProfile>): UserProfile {
  return {
    id: typeof payload?.id === 'number' ? payload.id : null,
    username: payload?.username ?? '',
    nick_name: payload?.nick_name ?? '',
    email: payload?.email ?? '',
    mobile: payload?.mobile ?? '',
    sex: typeof payload?.sex === 'number' ? payload.sex : 0,
    last_login: payload?.last_login ?? '',
    is_superuser: !!payload?.is_superuser,
    is_staff: !!payload?.is_staff,
    is_active: payload?.is_active !== false,
    date_joined: payload?.date_joined ?? '',
    add_time: payload?.add_time ?? '',
  }
}

function applyProfile(nextProfile: UserProfile) {
  Object.assign(profile, nextProfile)
  const nextForm: UserProfileForm = {
    nick_name: nextProfile.nick_name,
    email: nextProfile.email,
    mobile: nextProfile.mobile,
    sex: nextProfile.sex,
  }
  Object.assign(form, nextForm)
  initialForm.value = { ...nextForm }
}

function formatDateTime(value: string) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

async function fetchUserProfile() {
  loading.value = true
  const res = await http.httpGet<UserProfileResponse>('/user/me/', {})
  loading.value = false
  if (res?.result !== 1 || !res.data) {
    window.$toast({ title: res?.msg || '获取用户信息失败', type: 'error' })
    return false
  }
  applyProfile(normalizeProfile(res.data))
  return true
}

function resetForm() {
  Object.assign(form, initialForm.value)
  formRef.value?.clearValidate()
}

async function submitForm() {
  if (!formRef.value || saving.value || !dirty.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  const payload: UserProfileForm = {
    nick_name: form.nick_name.trim(),
    email: form.email.trim(),
    mobile: form.mobile.trim(),
    sex: form.sex,
  }
  const res = await http.httpPut<UserProfileResponse>('/user/me/update_info/', payload)
  saving.value = false

  if (res?.result !== 1 || !res.data) {
    window.$toast({ title: res?.msg || '修改个人信息失败', type: 'error' })
    return
  }

  const nextProfile = normalizeProfile(res.data)
  applyProfile(nextProfile)
  emit('updated', nextProfile)
  window.$toast({ title: res.msg || '个人信息已更新', type: 'success' })
}

async function open() {
  const loaded = await fetchUserProfile()
  if (!loaded) return
  return dialogRef.value?.open()
}

function close() {
  dialogRef.value?.close()
}

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.profile-sheet {
  width: 620px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 100px);
  overflow: auto;
  color: #111111;
  background: #ffffff;
  border-radius: 18px;
}

.profile-sheet__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(180px, 0.85fr);
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid #e8e8e8;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.015), rgba(0, 0, 0, 0)),
    linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
}

.profile-sheet__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-sheet__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 18px;
  border: 1px solid #d7d7d7;
  background: linear-gradient(135deg, #f9f9f9, #efefef);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.profile-sheet__avatar {
  border: 2px solid #ffffff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.profile-sheet__headline {
  min-width: 0;
}

.profile-sheet__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #7a7a7a;
}

.profile-sheet__name {
  margin: 6px 0 4px;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 700;
  color: #111111;
}

.profile-sheet__subline {
  font-size: 12px;
  color: #6d6d6d;
  font-weight: 500;
}

.profile-sheet__summary {
  display: grid;
  gap: 8px;
  align-content: start;
}

.profile-sheet__summary-item {
  padding: 11px 12px;
  border: 1px solid #e4e4e4;
  border-radius: 14px;
  background: #fcfcfc;
}

.profile-sheet__summary-label {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8b8b8b;
  font-weight: 700;
}

.profile-sheet__summary-value {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #151515;
}

.profile-sheet__content {
  display: grid;
  gap: 12px;
  padding: 14px 18px;
  background: #ffffff;
}

.profile-card {
  border: 1px solid #e7e7e7;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.035);
}

.profile-card--readonly {
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%);
}

.profile-card__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #efefef;
}

.profile-card__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a8a8a;
}

.profile-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #111111;
}

.profile-card__hint {
  margin: 0;
  font-size: 11px;
  color: #7a7a7a;
  text-align: right;
}

.profile-readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 16px 16px;
}

.profile-readonly-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #ededed;
  background: #fafafa;
}

.profile-readonly-item__label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #7a7a7a;
}

.profile-readonly-item__value {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #151515;
}

.profile-form {
  padding: 12px 16px 16px;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.profile-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #252525;
}

.profile-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.profile-form :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 12px;
  background: #f6f6f6;
  box-shadow: inset 0 0 0 1px #e6e6e6;
}

.profile-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px #111111;
}

.profile-form :deep(.el-input__inner) {
  color: #111111;
}

.profile-form__radio-group {
  display: flex;
  gap: 12px;
  min-height: 38px;
  align-items: center;
  padding: 0 12px;
  border-radius: 12px;
  background: #f6f6f6;
  box-shadow: inset 0 0 0 1px #e6e6e6;
}

.profile-form :deep(.el-radio) {
  margin-right: 0;
  color: #3c3c3c;
}

.profile-form :deep(.el-radio__input.is-checked .el-radio__inner) {
  border-color: #111111;
  background: #111111;
}

.profile-form :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #111111;
}

.profile-sheet__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 18px 18px;
}

.profile-btn {
  min-width: 88px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #111111;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }
}

.profile-btn--ghost {
  background: #ffffff;
  color: #555555;
}

.profile-btn--secondary {
  background: #f5f5f5;
  color: #111111;
}

.profile-btn--primary {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

@media (max-width: 900px) {
  .profile-sheet {
    width: min(620px, calc(100vw - 24px));
  }

  .profile-sheet__hero,
  .profile-form__grid,
  .profile-readonly-grid {
    grid-template-columns: 1fr;
  }

  .profile-sheet__hero,
  .profile-sheet__content,
  .profile-sheet__footer {
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
