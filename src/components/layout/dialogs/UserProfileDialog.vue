<template>
  <AstDialog
    ref="dialogRef"
    :title="cropSourceUrl ? '调整您的图片' : ''"
    :accessibleTitle="cropSourceUrl ? '调整您的图片' : '个人设置'"
    :modalClass="cropSourceUrl ? 'avatar-crop-modal' : ''"
    bgtype="white"
    topMove="0 !important"
    :showCancel="false"
    :showComfirm="false"
    :closeOnPressEscape="!cropSourceUrl && !avatarUploading && !saving"
    @cancel="handleDialogDismiss"
  >
    <div class="profile-sheet" :class="{ 'profile-sheet--avatar-editor': cropSourceUrl }">
      <input
        ref="fileInputRef"
        class="profile-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabindex="-1"
        aria-hidden="true"
        @change="handleFileSelected"
      />

      <template v-if="cropSourceUrl">
        <section
          class="avatar-editor"
          role="group"
          aria-labelledby="avatar-editor-title"
          v-loading="avatarUploading"
        >
          <header class="avatar-editor__header">
            <h2 id="avatar-editor-title" class="avatar-editor__title">调整您的图片</h2>
            <button
              type="button"
              class="avatar-editor__close"
              :disabled="avatarUploading"
              aria-label="关闭头像调整"
              @click="cancelCrop"
            >
              <span aria-hidden="true"></span>
            </button>
          </header>

          <div class="avatar-editor__body">
            <div
              ref="cropperStageRef"
              class="avatar-editor__stage"
              tabindex="0"
              aria-label="头像裁剪区域，拖动图片调整位置，使用方向键也可移动图片"
              @keydown="handleCropperKeydown"
            >
              <Cropper
                ref="cropperRef"
                class="avatar-editor__cropper"
                :src="cropSourceUrl"
                :stencil-component="CircleStencil"
                :stencil-props="cropperStencilProps"
                :stencil-size="cropperStencilSize"
                :resize-image="cropperResizeImage"
                :canvas="cropperCanvas"
                :transitions="false"
                :check-orientation="false"
                image-restriction="stencil"
                @ready="handleCropperReady"
                @error="handleCropperError"
              />
            </div>
          </div>

          <div class="avatar-editor__zoom" aria-label="头像缩放">
            <button
              type="button"
              :disabled="avatarUploading || !cropperReady || cropZoom <= MIN_CROP_ZOOM"
              aria-label="缩小头像"
              @click="adjustCropZoom(-CROP_ZOOM_STEP)"
            >−</button>
            <input
              type="range"
              :min="MIN_CROP_ZOOM"
              :max="MAX_CROP_ZOOM"
              :step="CROP_ZOOM_STEP"
              :value="cropZoom"
              :disabled="avatarUploading || !cropperReady"
              aria-label="头像缩放比例"
              @input="handleCropZoomInput"
            />
            <button
              type="button"
              :disabled="avatarUploading || !cropperReady || cropZoom >= MAX_CROP_ZOOM"
              aria-label="放大头像"
              @click="adjustCropZoom(CROP_ZOOM_STEP)"
            >＋</button>
          </div>

          <footer class="avatar-editor__footer">
            <button type="button" class="avatar-editor__cancel" :disabled="avatarUploading" @click="cancelCrop">
              取消
            </button>
            <button
              type="button"
              class="avatar-editor__save"
              :disabled="avatarUploading || !cropperReady"
              @click="confirmAvatarUpload"
            >
              {{ avatarUploading ? '保存中...' : '保存' }}
            </button>
          </footer>
        </section>
      </template>

      <template v-else>
        <div class="profile-sheet__hero">
          <div class="profile-sheet__identity">
            <button
              ref="profileAvatarButtonRef"
              type="button"
              class="profile-sheet__avatar-wrap"
              :disabled="loading || saving"
              aria-label="修改头像"
              title="修改头像"
              @click="openFilePicker"
            >
              <el-avatar :key="userAvatarRenderKey" :size="60" :src="userAvatar" class="profile-sheet__avatar" />
              <span class="profile-sheet__avatar-action" aria-hidden="true">修改</span>
            </button>

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
              <p class="profile-card__hint">可修改头像、昵称、邮箱、手机号和性别</p>
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
          <button type="button" class="profile-btn profile-btn--ghost" :disabled="saving" @click="close">关闭</button>
          <button type="button" class="profile-btn profile-btn--secondary" :disabled="loading || saving || !dirty" @click="resetForm">
            重置
          </button>
          <button type="button" class="profile-btn profile-btn--primary" :disabled="loading || saving || !dirty" @click="submitForm">
            {{ saving ? '保存中...' : '保存资料' }}
          </button>
        </div>
      </template>
    </div>
  </AstDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { CircleStencil, Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import AstDialog from '@/components/common/general/dialog.vue'
import {
  createCroppedAvatarFile,
  revokeObjectUrl,
  type AvatarCropperLike,
} from './avatarCrop'
import {
  useCurrentUserProfile,
  type CurrentUserProfile,
  type CurrentUserProfileForm,
} from '@/composables/useCurrentUserProfile'

const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024
const ACCEPTED_SOURCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MIN_CROP_ZOOM = 1
const MAX_CROP_ZOOM = 1.5
const CROP_ZOOM_STEP = 0.05
const EMPTY_PROFILE: CurrentUserProfile = {
  id: null,
  username: '',
  nick_name: '',
  display_name: '',
  email: '',
  mobile: '',
  sex: 0,
  last_login: '',
  is_superuser: false,
  is_staff: false,
  is_active: true,
  date_joined: '',
  add_time: '',
  avatar_url: '',
}

const emit = defineEmits<{
  updated: [profile: CurrentUserProfile]
}>()

const dialogRef = ref<InstanceType<typeof AstDialog> | null>(null)
const formRef = ref<FormInstance | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const cropperRef = ref<(AvatarCropperLike & {
  zoom: (factor: number) => void
  move: (left: number, top: number) => void
}) | null>(null)
const cropperStageRef = ref<HTMLDivElement | null>(null)
const profileAvatarButtonRef = ref<HTMLButtonElement | null>(null)
const saving = ref(false)
const avatarUploading = ref(false)
const cropperReady = ref(false)
const cropSourceUrl = ref('')
const cropZoom = ref(MIN_CROP_ZOOM)
let appliedCropZoom = MIN_CROP_ZOOM

const {
  profile: sharedProfile,
  avatarUrl: userAvatar,
  avatarRenderKey: userAvatarRenderKey,
  loading,
  error: profileError,
  fetchProfile,
  updateProfile,
  uploadAvatar,
  ensureProfileSync,
} = useCurrentUserProfile()

const profile = computed(() => sharedProfile.value || EMPTY_PROFILE)
const form = reactive<CurrentUserProfileForm>({ nick_name: '', email: '', mobile: '', sex: 0 })
const initialForm = ref<CurrentUserProfileForm>({ nick_name: '', email: '', mobile: '', sex: 0 })
const cropperStencilProps = {
  movable: false,
  resizable: false,
  handlers: {},
  lines: {},
}
const cropperResizeImage = { adjustStencil: false, touch: false, wheel: false }
const cropperStencilSize = ({ boundaries }: { boundaries: { width: number; height: number } }) => {
  const size = Math.round(Math.min(boundaries.width, boundaries.height) * 0.8)
  return { width: size, height: size }
}
const cropperCanvas = {
  width: 512,
  height: 512,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high' as const,
}

const formRules: FormRules<CurrentUserProfileForm> = {
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

function syncForm(nextProfile: CurrentUserProfile) {
  const nextForm: CurrentUserProfileForm = {
    nick_name: nextProfile.nick_name,
    email: nextProfile.email,
    mobile: nextProfile.mobile,
    sex: nextProfile.sex,
  }
  Object.assign(form, nextForm)
  initialForm.value = { ...nextForm }
  formRef.value?.clearValidate()
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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function resetForm() {
  Object.assign(form, initialForm.value)
  formRef.value?.clearValidate()
}

function openFilePicker() {
  if (avatarUploading.value) return
  if (fileInputRef.value) fileInputRef.value.value = ''
  fileInputRef.value?.click()
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!ACCEPTED_SOURCE_TYPES.has(file.type)) {
    window.$toast({ title: '请选择 JPG、PNG 或 WebP 图片', type: 'error' })
    return
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    window.$toast({ title: '原图片不能超过 20 MB', type: 'error' })
    return
  }

  revokeObjectUrl(cropSourceUrl.value)
  cropperReady.value = false
  resetCropZoom()
  cropSourceUrl.value = URL.createObjectURL(file)
  await nextTick()
  cropperStageRef.value?.focus()
}

function resetCropZoom() {
  cropZoom.value = MIN_CROP_ZOOM
  appliedCropZoom = MIN_CROP_ZOOM
}

function setCropZoom(value: number) {
  if (avatarUploading.value || !cropperReady.value || !cropperRef.value) return
  const nextZoom = Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, value))
  cropperRef.value.zoom(nextZoom / appliedCropZoom)
  cropZoom.value = nextZoom
  appliedCropZoom = nextZoom
}

function handleCropZoomInput(event: Event) {
  setCropZoom(Number((event.target as HTMLInputElement).value))
}

function adjustCropZoom(delta: number) {
  setCropZoom(Number((cropZoom.value + delta).toFixed(2)))
}

function handleCropperReady() {
  resetCropZoom()
  cropperReady.value = true
}

function handleCropperError() {
  cropperReady.value = false
  window.$toast({ title: '图片读取失败，请重新选择', type: 'error' })
}

function handleCropperKeydown(event: KeyboardEvent) {
  if (avatarUploading.value || !cropperReady.value || !cropperRef.value) return
  const movement: Record<string, [number, number]> = {
    ArrowLeft: [-12, 0],
    ArrowRight: [12, 0],
    ArrowUp: [0, -12],
    ArrowDown: [0, 12],
  }
  const delta = movement[event.key]
  if (!delta) return
  event.preventDefault()
  cropperRef.value.move(delta[0], delta[1])
}

function cancelCrop() {
  if (avatarUploading.value) return
  const hadCrop = !!cropSourceUrl.value
  revokeObjectUrl(cropSourceUrl.value)
  cropperReady.value = false
  resetCropZoom()
  cropSourceUrl.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
  if (hadCrop) void nextTick(() => profileAvatarButtonRef.value?.focus())
}

async function confirmAvatarUpload() {
  if (!cropperRef.value || !cropperReady.value || avatarUploading.value) return
  avatarUploading.value = true
  try {
    const croppedFile = await createCroppedAvatarFile(cropperRef.value)
    const nextProfile = await uploadAvatar(croppedFile)
    emit('updated', nextProfile)
    cancelCropAfterUpload()
    window.$toast({ title: '头像已更新', type: 'success' })
  } catch (error) {
    window.$toast({ title: errorMessage(error, '头像上传失败，请重试'), type: 'error' })
  } finally {
    avatarUploading.value = false
  }
}

function cancelCropAfterUpload() {
  revokeObjectUrl(cropSourceUrl.value)
  cropperReady.value = false
  resetCropZoom()
  cropSourceUrl.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
  void nextTick(() => profileAvatarButtonRef.value?.focus())
}

async function submitForm() {
  if (!formRef.value || saving.value || !dirty.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const nextProfile = await updateProfile({
      nick_name: form.nick_name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      sex: form.sex,
    })
    syncForm(nextProfile)
    emit('updated', nextProfile)
    window.$toast({ title: '个人信息已更新', type: 'success' })
  } catch (error) {
    window.$toast({ title: errorMessage(error, '修改个人信息失败'), type: 'error' })
  } finally {
    saving.value = false
  }
}

async function open() {
  ensureProfileSync()
  try {
    const loadedProfile = await fetchProfile(true)
    if (profileError.value || !loadedProfile) throw new Error(profileError.value || '获取用户信息失败')
    syncForm(loadedProfile)
  } catch (error) {
    window.$toast({ title: errorMessage(error, '获取用户信息失败'), type: 'error' })
    return
  }
  return dialogRef.value?.open()
}

function handleDialogDismiss() {
  cancelCrop()
}

function close() {
  if (avatarUploading.value) return
  cancelCrop()
  dialogRef.value?.close()
}

function handleEscape(event: KeyboardEvent) {
  if (!cropSourceUrl.value || avatarUploading.value || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  cancelCrop()
}

onMounted(() => {
  ensureProfileSync()
  window.addEventListener('keydown', handleEscape, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape, true)
  revokeObjectUrl(cropSourceUrl.value)
})

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.profile-sheet {
  width: 720px;
  max-width: calc(100vw - 48px);
  overflow: hidden;
  color: #111111;
  background: #ffffff;
  border-radius: 16px;
}

.profile-sheet--avatar-editor {
  width: 540px;
  height: min(580px, calc(100vh - 40px));
  min-height: 500px;
  max-width: calc(100vw - 40px);
  border-radius: 24px;
}

.profile-file-input {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.profile-sheet__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  align-items: center;
  gap: 14px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #e8e8e8;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.015), rgba(0, 0, 0, 0)),
    linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
}

.profile-sheet__identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-sheet__avatar-wrap {
  position: relative;
  display: block;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 15px;
  border: 1px solid #d7d7d7;
  background: linear-gradient(135deg, #f9f9f9, #efefef);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
  cursor: pointer;
  overflow: hidden;

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid #111111;
    outline-offset: 3px;
  }
}

.profile-sheet__avatar {
  display: block;
  border: 2px solid #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: filter 0.18s ease, transform 0.18s ease;
}

.profile-sheet__avatar-action {
  position: absolute;
  inset: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.62);
  color: #ffffff;
  font-size: 11px;
  font-weight: 650;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.profile-sheet__avatar-wrap:not(:disabled):hover .profile-sheet__avatar,
.profile-sheet__avatar-wrap:not(:disabled):focus-visible .profile-sheet__avatar {
  filter: grayscale(0.25);
  transform: scale(1.035);
}

.profile-sheet__avatar-wrap:not(:disabled):hover .profile-sheet__avatar-action,
.profile-sheet__avatar-wrap:not(:disabled):focus-visible .profile-sheet__avatar-action {
  opacity: 1;
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
  margin: 4px 0 3px;
  font-size: 21px;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  align-content: center;
}

.profile-sheet__summary-item {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #e4e4e4;
  border-radius: 11px;
  background: #fcfcfc;
}

.profile-sheet__summary-label {
  display: block;
  margin-bottom: 3px;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8b8b8b;
  font-weight: 700;
}

.profile-sheet__summary-value {
  display: block;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  color: #151515;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-sheet__content {
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(0, 1.28fr);
  align-items: stretch;
  gap: 10px;
  padding: 10px 16px;
  background: #ffffff;
}

.profile-card {
  border: 1px solid #e7e7e7;
  border-radius: 13px;
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
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #efefef;
}

.profile-card__kicker {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a8a8a;
}

.profile-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111111;
}

.profile-card__hint {
  margin: 0;
  max-width: 190px;
  font-size: 10px;
  color: #7a7a7a;
  text-align: right;
}

.profile-readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 10px 10px;
}

.profile-readonly-item {
  min-width: 0;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid #ededed;
  background: #fafafa;
}

.profile-readonly-item__label {
  display: block;
  margin-bottom: 2px;
  font-size: 10px;
  color: #7a7a7a;
}

.profile-readonly-item__value {
  display: block;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  color: #151515;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-form {
  padding: 8px 12px 10px;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10px;
}

.profile-form :deep(.el-form-item__label) {
  height: 20px;
  padding-bottom: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #252525;
}

.profile-form :deep(.el-form-item) {
  margin-bottom: 9px;
}

.profile-form :deep(.el-input__wrapper) {
  min-height: 34px;
  border-radius: 9px;
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
  gap: 14px;
  min-height: 34px;
  align-items: center;
  padding: 0 12px;
  border-radius: 9px;
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
  gap: 7px;
  padding: 0 16px 12px;
}

.avatar-editor {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  height: 100%;
  background: #ffffff;
}

.avatar-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px 0;
}

.avatar-editor__title {
  margin: 0;
  color: #17191c;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
}

.avatar-editor__close {
  position: relative;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #3f4144;
  cursor: pointer;
  transition: background-color 0.16s ease, opacity 0.16s ease;

  span::before,
  span::after {
    content: '';
    position: absolute;
    top: 16px;
    left: 10px;
    width: 14px;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
  }

  span::before {
    transform: rotate(45deg);
  }

  span::after {
    transform: rotate(-45deg);
  }

  &:not(:disabled):hover {
    background: #f3f3f3;
  }

  &:focus-visible {
    outline: 2px solid #17191c;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
}

.avatar-editor__body {
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 8px 28px 2px;
}

.avatar-editor__stage {
  position: relative;
  width: min(340px, calc(100vh - 240px), 100%);
  aspect-ratio: 1;
  overflow: hidden;
  background: #ffffff;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    z-index: 2;
    inset: -1px;
    pointer-events: none;
    background:
      linear-gradient(to bottom, #ffffff 0%, rgba(255, 255, 255, 0.96) 2%, rgba(255, 255, 255, 0) 12%),
      linear-gradient(to top, #ffffff 0%, rgba(255, 255, 255, 0.96) 2%, rgba(255, 255, 255, 0) 12%),
      linear-gradient(to right, #ffffff 0%, rgba(255, 255, 255, 0.96) 2%, rgba(255, 255, 255, 0) 12%),
      linear-gradient(to left, #ffffff 0%, rgba(255, 255, 255, 0.96) 2%, rgba(255, 255, 255, 0) 12%);
  }

  &:focus-visible {
    outline: 2px solid #17191c;
    outline-offset: 4px;
  }
}

.avatar-editor__cropper {
  width: 100%;
  height: 100%;
  background: #ffffff;
}

.avatar-editor__cropper :deep(.vue-advanced-cropper__background) {
  background: #ffffff;
}

.avatar-editor__cropper :deep(.vue-advanced-cropper__foreground) {
  background: rgba(255, 255, 255, 0.74);
  opacity: 1;
  backdrop-filter: blur(6px);
}

.avatar-editor__cropper :deep(.vue-circle-stencil__preview) {
  border: 1px solid rgba(0, 0, 0, 0.055);
  box-shadow: none;
}

.avatar-editor__zoom {
  display: flex;
  align-items: center;
  justify-self: center;
  width: min(340px, calc(100% - 56px));
  gap: 12px;
  padding: 2px 0 12px;
}

.avatar-editor__zoom button {
  width: 24px;
  height: 30px;
  flex: 0 0 24px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #7d7f82;
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  transition: color 0.16s ease, background-color 0.16s ease, opacity 0.16s ease;

  &:not(:disabled):hover {
    background: #f3f3f3;
    color: #17191c;
  }

  &:focus-visible {
    outline: 2px solid #17191c;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.avatar-editor__zoom input[type='range'] {
  width: auto;
  height: 24px;
  min-width: 0;
  flex: 1;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:focus-visible {
    outline: none;
  }
}

.avatar-editor__zoom input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 999px;
  background: #eeeeee;
}

.avatar-editor__zoom input[type='range']::-webkit-slider-thumb {
  width: 22px;
  height: 22px;
  margin-top: -10px;
  appearance: none;
  border: 1px solid #dedede;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.avatar-editor__zoom input[type='range']:focus-visible::-webkit-slider-thumb {
  outline: 2px solid #17191c;
  outline-offset: 3px;
}

.avatar-editor__zoom input[type='range']::-moz-range-track {
  height: 3px;
  border: 0;
  border-radius: 999px;
  background: #eeeeee;
}

.avatar-editor__zoom input[type='range']::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: 1px solid #dedede;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.avatar-editor__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 28px 22px;
}

.avatar-editor__cancel,
.avatar-editor__save {
  height: 38px;
  padding: 0 17px;
  border: 0;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease, opacity 0.16s ease, transform 0.16s ease;

  &:not(:disabled):active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid #17191c;
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.avatar-editor__cancel {
  padding-right: 8px;
  padding-left: 8px;
  background: transparent;
  color: #898b8e;

  &:not(:disabled):hover {
    color: #17191c;
  }
}

.avatar-editor__save {
  min-width: 74px;
  background: #17191c;
  color: #ffffff;

  &:not(:disabled):hover {
    background: #2b2d30;
  }
}

.profile-btn {
  min-width: 76px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #111111;
  font-size: 12px;
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

  &:focus-visible {
    outline: 2px solid #111111;
    outline-offset: 2px;
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

@media (max-width: 760px) {
  .profile-sheet {
    width: min(620px, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
  }

  .profile-sheet--avatar-editor {
    width: min(540px, calc(100vw - 24px));
    height: min(580px, calc(100vh - 24px));
    min-height: 500px;
  }

  .profile-sheet__hero {
    grid-template-columns: 1fr;
  }

  .profile-sheet__content {
    grid-template-columns: 1fr;
  }

  .profile-readonly-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .profile-sheet__hero,
  .profile-sheet__content,
  .profile-sheet__footer {
    padding-left: 12px;
    padding-right: 12px;
  }
}

@media (max-width: 520px) {
  .profile-readonly-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-card__hint {
    display: none;
  }

  .profile-sheet--avatar-editor {
    height: min(540px, calc(100vh - 24px));
    min-height: 440px;
  }

  .avatar-editor__header {
    padding: 20px 20px 0;
  }

  .avatar-editor__title {
    font-size: 20px;
  }

  .avatar-editor__body {
    padding-right: 20px;
    padding-left: 20px;
  }

  .avatar-editor__zoom {
    width: calc(100% - 40px);
    gap: 10px;
    padding-bottom: 10px;
  }

  .avatar-editor__footer {
    padding: 0 20px 18px;
  }
}

@media (max-height: 680px) {
  .profile-sheet__hero {
    padding-top: 10px;
    padding-bottom: 9px;
  }

  .profile-sheet__avatar {
    width: 52px !important;
    height: 52px !important;
  }

  .profile-sheet__content {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .profile-sheet__footer {
    padding-bottom: 9px;
  }

  .profile-sheet--avatar-editor {
    height: min(560px, calc(100vh - 24px));
    min-height: 0;
  }

  .avatar-editor__header {
    padding-top: 20px;
  }

  .avatar-editor__body {
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .avatar-editor__zoom {
    padding-bottom: 10px;
  }

  .avatar-editor__footer {
    padding-bottom: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-sheet__avatar,
  .profile-sheet__avatar-action,
  .profile-btn,
  .avatar-editor__close,
  .avatar-editor__zoom button,
  .avatar-editor__cancel,
  .avatar-editor__save {
    transition-duration: 0.01ms !important;
  }
}
</style>
