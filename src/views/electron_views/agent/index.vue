<template>
  <div class="agent-dashboard-page">
    <section class="agent-hero">
      <div class="agent-hero-main">
        <div class="agent-hero-icon-shell">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
            <circle cx="12" cy="17" r="1" />
            <path d="M12 14v2" />
          </svg>
        </div>
        <div class="agent-hero-copy">
          <p class="agent-hero-eyebrow">AsyncTest Agent</p>
          <h1 class="agent-hero-title">Agent 工作台</h1>
          <p class="agent-hero-description">
            AI 驱动的测试助手，帮你更高效地完成测试工作。
          </p>
        </div>
      </div>
    </section>

    <section class="agent-features-grid">
      <article class="agent-feature-card" @click="enterChat">
        <div class="agent-feature-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 class="agent-feature-title">Chat</h3>
        <p class="agent-feature-desc">与 AI 助手对话，获取测试建议和方案</p>
        <span class="agent-feature-arrow">→</span>
      </article>

      <article class="agent-feature-card" @click="enterKnowledge">
        <div class="agent-feature-icon agent-feature-icon--kb">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="13" y2="11" />
          </svg>
        </div>
        <h3 class="agent-feature-title">知识库</h3>
        <p class="agent-feature-desc">构建目录式知识体系，服务于智能测试生成</p>
        <span class="agent-feature-arrow">→</span>
      </article>

      <article class="agent-feature-card agent-feature-card--disabled">
        <div class="agent-feature-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <h3 class="agent-feature-title">更多功能</h3>
        <p class="agent-feature-desc">更多 Agent 能力，敬请期待</p>
      </article>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function enterChat() {
  router.push({ name: 'agentChat' })
}

function enterKnowledge() {
  router.push({ name: 'agentKnowledgeList' })
}
</script>

<style lang="scss" scoped>
.agent-dashboard-page {
  height: 100vh;
  box-sizing: border-box;
  padding: 24px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden;
}

.agent-hero {
  display: flex;
  align-items: center;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(139, 92, 246, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff, #f8fafc);
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
}

.agent-hero-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.agent-hero-icon-shell {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(238, 242, 255, 0.96)),
    rgba(139, 92, 246, 0.04);
  border: 1px solid rgba(139, 92, 246, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 8px 22px rgba(15, 23, 42, 0.06);
  color: #7c3aed;
}

.agent-hero-copy {
  max-width: 720px;
}

.agent-hero-eyebrow {
  margin: 0 0 6px 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8b5cf6;
}

.agent-hero-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
  color: #111827;
}

.agent-hero-description {
  margin: 10px 0 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #6b7280;
}

.agent-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.agent-feature-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #fbfbfc);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);

  &:hover:not(.agent-feature-card--disabled) {
    transform: translateY(-2px);
    border-color: rgba(139, 92, 246, 0.34);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.1);

    .agent-feature-arrow {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.agent-feature-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  color: #6366f1;

  &--kb {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    color: #16a34a;
  }
}

.agent-feature-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.agent-feature-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
}

.agent-feature-arrow {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 18px;
  color: #8b5cf6;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}
</style>
