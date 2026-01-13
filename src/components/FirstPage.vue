<template>
  <div class="first-page">
    <!-- Main Content Wrapper -->
    <div class="main-wrapper">
      <!-- Header Navigation -->
      <header class="header">
        <div class="container">
          <nav class="nav">
            <div class="nav-left">
              <a href="#" class="logo" @click.prevent="scrollToTop">
                <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light2.svg" alt="AsyncTest"
                  class="logo-image" />
                <span class="logo-text">AsyncTest</span>
              </a>
            </div>
            <div class="nav-center">
              <a href="#features" class="nav-link" @click.prevent="scrollToSection('features')">功能</a>
              <a href="#ai" class="nav-link" @click="scrollToSection('ai')">
                AI
                <span class="badge">New</span>
              </a>
              <a href="#showcase" class="nav-link" @click.prevent="scrollToSection('showcase')">ShowCase</a>
            </div>
            <div class="nav-right">
              <a href="https://docs.asynctest.com/ast_caller/install.html" class="btn-secondary idea-plugin-btn"
                target="_blank">
                <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg" alt="IDEA"
                  class="idea-icon" />
                <span>IDEA Plugin</span>
              </a>
              <button class="btn-primary btn-login-trigger" @click="openLoginPanel">开始使用</button>
            </div>
          </nav>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero">
        <div class="container">
          <div class="hero-content">
            <h1 class="hero-title">
              <span class="gradient-text">Async</span>hronous Way of
              <span class="gradient-text">Test</span>ing for Any Interface
            </h1>
            <p class="hero-subtitle">
              全异步协程驱动 · 协商式取消模型 · 接口文档同步 · 快速用例编排 · Mock 快速响应
            </p>
            <div class="hero-actions">
              <button class="btn-hero-primary btn-login-trigger" @click="openLoginPanel">
                <span>快速开始</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </button>
              <a href="https://docs.asynctest.com/start.html" class="btn-hero-secondary" target="_blank">查看文档</a>
            </div>
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-value">100+</div>
                <div class="stat-label">活跃用户</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">1K+</div>
                <div class="stat-label">API 测试</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">7 * 24</div>
                <div class="stat-label">Mock 服务</div>
              </div>
            </div>
          </div>

          <!-- Interactive Demo -->
          <div class="hero-demo">
            <CaseDemoVideo></CaseDemoVideo>
          </div>
        </div>

        <!-- Background decorations -->
        <div class="hero-bg">
          <div class="grid-overlay"></div>
          <div class="glow glow-1"></div>
          <div class="glow glow-2"></div>
        </div>
      </section>

      <section id="features" class="features">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">核心功能</h2>
            <p class="section-subtitle">一站式 API 测试解决方案</p>
          </div>

          <div class="features-grid">
            <div v-for="feature in features" :key="feature.title" class="feature-card">
              <div class="feature-icon" v-html="feature.icon"></div>
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
              <ul class="feature-list">
                <li v-for="item in feature.list" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- <section class="tech-stack" id="tech">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">技术栈</h2>
            <p class="section-subtitle">基于现代化技术构建</p>
          </div>

          <div class="tech-grid">
            <div v-for="(tech, index) in techStack" :key="tech.name" class="tech-item scroll-hidden"
              :style="{ transitionDelay: `${index * 100}ms` }">
              <div class="tech-logo">{{ tech.name }}</div>
              <p class="tech-description">{{ tech.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="cta" id="showcase">
        <div class="container">
          <div class="cta-content scroll-hidden">
            <h2 class="cta-title">立即开始使用 AsyncTest</h2>
            <p class="cta-subtitle">快速搭建你的 API 测试环境</p>
            <div class="cta-actions">
              <div v-for="card in ctaCards" :key="card.title" class="cta-card">
                <div class="cta-card-icon">{{ card.icon }}</div>
                <h3 class="cta-card-title">{{ card.title }}</h3>
                <p class="cta-card-description">{{ card.description }}</p>
                <code v-if="card.code" class="cta-code">{{ card.code }}</code>
                <button v-else class="cta-card-button">{{ card.buttonText }}</button>
              </div>
            </div>
          </div>
        </div>
        <div class="cta-bg">
          <div class="glow glow-3"></div>
        </div>
      </section> -->

      <!-- Footer -->
      <footer class="footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-left">
              <div class="footer-logo">
                <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light2.svg" alt="AsyncTest"
                  class="footer-logo-image" />
              </div>
              <p class="footer-description">Using approachable, performant and less source code for testing of
                your webs.</p>
            </div>
            <div class="footer-links">
              <div class="footer-group">
                <h4 class="footer-title">产品</h4>
                <a href="#" class="footer-link">功能</a>
                <a href="#" class="footer-link">定价</a>
                <a href="#" class="footer-link">案例</a>
              </div>
              <div class="footer-group">
                <h4 class="footer-title">资源</h4>
                <a href="#" class="footer-link">文档</a>
                <a href="#" class="footer-link">API 参考</a>
                <a href="#" class="footer-link">更新日志</a>
              </div>
              <div class="footer-group">
                <h4 class="footer-title">社区</h4>
                <a href="#" class="footer-link">GitHub</a>
                <a href="#" class="footer-link">讨论区</a>
                <a href="#" class="footer-link">贡献指南</a>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <p class="footer-copyright">© 2025 AsyncTest. All rights reserved（粤ICP备2024322282号-1）.</p>
          </div>
        </div>
      </footer>
    </div>
    <div class="login-panel" :class="{ active: isLoginActive }">
      <button class="login-close" aria-label="关闭登录" @click="closeLoginPanel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </button>

      <div class="login-content" @click.stop>
        <div class="login-header">
          <div class="login-logo">
            <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light2.svg" alt="AsyncTest"
              class="login-logo-image" />
          </div>
          <h2 class="login-title">欢迎回来</h2>
          <p class="login-subtitle">使用禅道登录你的 API 工作区</p>
        </div>

        <div class="login-form">
          <div class="form-group">
            <label class="form-label">账号</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <input type="email" class="form-input" placeholder="username" v-model="loginForm.username">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">密码</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <input :type="passwordVisible ? 'text' : 'password'" class="form-input" placeholder="••••••••"
                v-model="loginForm.password" @keyup.enter="enter">
              <button type="button" class="password-toggle" @click="togglePassword">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-wrapper">
              <CheckBox :check="loginForm.checked ? 'check' : 'none'" @change="changeRemember" border-color="#fff">
              </CheckBox>
              <span class="checkbox-label">记住我</span>
            </label>
            <a href="#" @click="unOpen" class="forgot-link">忘记密码？</a>
          </div>

          <button class="btn-login-submit" :disabled="disabled" @click="enter">
            <span>{{ loginButtonText }}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>

          <div class="divider">
            <span class="divider-text">或者使用</span>
          </div>

          <div class="social-login">
            <button type="button" class="btn-social" @click.prevent="handleSocialLogin('GitHub')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
            <button type="button" class="btn-social" @click.prevent="handleSocialLogin('Google')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4" />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853" />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05" />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>
          </div>

          <div class="signup-prompt">
            还没有账号？<a href="#" @click="unOpen" class="signup-link">立即注册</a>
          </div>
        </div>
      </div>

      <!-- Login Background Decoration -->
      <div class="login-bg">
        <div class="login-glow login-glow-1"></div>
        <div class="login-glow login-glow-2"></div>
        <div class="login-grid"></div>
        <div class="login-particles">
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import CheckBox from '@/assets/motion/checkbox.vue'
import { ApiLogin } from "@/api/anonymous/index";
import { useStore } from "@/store";
import { useRouter } from "vue-router";
import CaseDemoVideo from '@/components/video.vue'

// ========================================
// 数据定义
// ========================================
const store = useStore();
const router = useRouter();
const isLoginActive = ref(false)
const passwordVisible = ref(false)
const isLoggingIn = ref(false)
const loginButtonText = ref('登录')

// 1. 定义一个数组来存储需要动画的元素 DOM
const scrollElements = ref<HTMLElement[]>([])

// 2. 配合 v-for 或 ref 使用的函数，把 DOM 塞进数组
const setScrollRef = (el: any) => {
  if (el && !scrollElements.value.includes(el)) {
    scrollElements.value.push(el)
  }
}

const loginForm = ref({
  username: '',
  password: '',
  checked: false
})

// 代码示例
const codeExample = `import { httpPost } from '@/utils/http'

// 创建 API 测试
const testAPI = async () => {
  const response = await httpPost('/api/test', {
    method: 'GET',
    url: 'https://api.example.com/users'
  })
  return response
}`

// 语法高亮后的代码
const highlightedCode = computed(() => {
  let html = codeExample
  html = html.replace(/\b(import|from|const|await|async|return)\b/g, '<span class="code-keyword">$1</span>')
  html = html.replace(/\b(httpPost)\b/g, '<span class="code-function">$1</span>')
  html = html.replace(/'([^']*)'/g, '<span class="code-string">\'$1\'</span>')
  html = html.replace(/\b(testAPI|response)\b/g, '<span class="code-variable">$1</span>')
  html = html.replace(/(\w+):/g, '<span class="code-property">$1</span>:')
  html = html.replace(/(\/\/.*)/g, '<span class="code-comment">$1</span>')
  return html
})

// 功能列表
const features = ref([
  {
    title: '全异步协程',
    description: '基于 Kotlin 协程的全异步执行模型，协商式取消机制，高效处理大规模接口测试',
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    list: ['协程驱动执行', '协商式取消', '高并发支持']
  },
  {
    title: '可视化编排',
    description: '拖拽式流程编排，直观的可视化界面，轻松构建复杂测试流程',
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2"/></svg>',
    list: ['拖拽式编排', '流程可视化', '条件分支控制']
  },
  {
    title: '实时监控',
    description: '实时监控 API 性能，自动记录请求响应，提供详细的性能分析报告',
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    list: ['性能监控', '请求录制', '数据分析']
  },
  {
    title: 'Mock 服务',
    description: '强大的 Mock 数据生成，支持动态规则，模拟各种 API 响应场景',
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    list: ['动态 Mock 规则', '全局参数化', '自定义响应']
  },
  {
    title: '数据驱动',
    description: '支持数据驱动测试，导入 Excel/CSV，批量执行测试用例',
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    list: ['高性能在线表格', '参数化测试', '批量执行']
  },
  {
    title: '团队协作',
    description: '多人协作测试，权限管理，版本控制，满足团队开发需求',
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    list: ['多人协作', '权限控制', '版本管理']
  }
])

// 技术栈
const techStack = ref([
  { name: 'Vue 3', description: 'Composition API' },
  { name: 'TypeScript', description: '类型安全' },
  { name: 'Vite', description: '极速构建' },
  { name: 'Element Plus', description: 'UI 组件库' },
  { name: 'Monaco', description: '代码编辑器' },
  { name: 'IndexedDB', description: '本地存储' }
])

// CTA 卡片
const ctaCards = ref([
  {
    icon: '📦',
    title: '安装',
    description: '使用 yarn 快速安装依赖',
    code: 'yarn install'
  },
  {
    icon: '🚀',
    title: '启动',
    description: '启动开发服务器',
    code: 'yarn dev'
  },
  {
    icon: '📚',
    title: '学习',
    description: '浏览文档和示例',
    buttonText: '查看文档'
  }
])

onMounted(async () => {
  console.log("on mounted");
  rememberCheck();

  // 1. 原有的键盘监听
  document.addEventListener('keydown', handleKeydown)
  document.body.classList.remove('login-active')
  document.body.style.overflow = ''
  // 2. 新增：滚动动画观察器
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // 当元素进入视口 10% 时
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target) // 动画只播放一次
      }
    })
  }, {
    threshold: 0.1
  })

  // 3. 直接查找所有带有 scroll-hidden 的元素并开始监视
  // 使用 setTimeout 确保 DOM 已经完全渲染
  setTimeout(() => {
    const hiddenElements = document.querySelectorAll('.scroll-hidden')
    hiddenElements.forEach((el) => observer.observe(el))
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)

  // 【关键修复 2】: 组件销毁时，必须把 body 上的类也删掉！
  // 之前你只删了 style.overflow，漏了下面这一行：
  document.body.classList.remove('login-active')
  document.body.style.overflow = ''
})

router.beforeEach((to: any, from: any, next: any) => {
  rememberCheck();
  next();
});

function rememberCheck() {
  // 获取记住账号密码的状态
  store.dispatch("getRemember").then((res: any) => {
    // 如果res为false表示从来没有插入过remember状态，则现场插入一个当前的remember状态
    if (res !== null) {
      // 同步当前checked状态\
      console.log(res);

      loginForm.value.checked = res.remember;
      console.log(res.remember);

      if (res.remember === true) {
        // 如果记住密码，将账号密码填充至登陆输入框
        store.dispatch("getUser").then((res) => {
          if (res && res.username && res.password) {
            loginForm.value.username = res.username;
            loginForm.value.password = res.password;
          }
        });
      } else {
        loginForm.value.username = "";
        loginForm.value.password = "";
      }
    }
  });
}

function changeRemember(status: string) {
  loginForm.value.checked = status === 'check'
  store.dispatch('saveRemember', status)
}


// ========================================
// 方法定义
// ========================================

const openLoginPanel = () => {
  isLoginActive.value = true
  document.body.style.overflow = 'hidden'
}

const closeLoginPanel = () => {
  isLoginActive.value = false
  document.body.style.overflow = ''
}

const togglePassword = () => {
  passwordVisible.value = !passwordVisible.value
}

const disabled = ref(false)

function enter() {
  if (disabled.value) return
  window.$toast({ title: '正在登录，请稍后...' })

  if (!loginForm.value.username) {
    window.$toast({ title: '请输入用户名。' })
    return;
  }
  if (!loginForm.value.password) {
    window.$toast({ title: '请输入登录密码。' })
    return;
  }
  disabled.value = true;
  validateUser();
}
function validateUser() {
  const data = {
    username: loginForm.value.username,
    password: loginForm.value.password,
  };
  ApiLogin(data).then((res: any) => {
    console.log(res);
    if (res.result === 1) {
      window.$toast({ title: '登录成功！', type: 'success' })
      const userStatus = {
        userId: res.data.id,
        username: loginForm.value.username,
        password: loginForm.value.password,
        role: res.data.role,
        nickName: res.data.nick_name,
        email: res.data.email,
        mobile: res.data.mobile,
        sex: res.data.sex,
        remember: loginForm.value.checked,
        privateKey: res.data.private_key,
      };
      console.log(userStatus);

      store.dispatch("saveUser", userStatus).then((userRes) => {
        console.log(res.data.default_project_id);
        const projectId = res.data.default_project_id;
        if (projectId === null) {
          router.push({ name: "project" });
        } else {
          router.push({ name: "data", params: { project: projectId } });
        }
      });
    } else {
      window.$toast({ title: res.msg, type: 'error' })
    }
    disabled.value = false;
  });
}

const handleSocialLogin = (provider: string) => {
  ZenDaoValid()
}

function ZenDaoValid() {
  window.$toast({ title: '当前域下仅可使用禅道进行登录。' })
}
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function unOpen() {
  window.$toast({ title: '暂未开放，敬请期待。' })
}

const scrollToSection = (id: string) => {
  unOpen()
  return
  // const element = document.getElementById(id)
  // if (element) {
  //   element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // }
}

// 键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isLoginActive.value) {
    closeLoginPanel()
  }
}

// ========================================
// 生命周期
// ========================================



onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

// 监听登录面板状态
watch(isLoginActive, (newVal) => {
  if (newVal) {
    document.body.classList.add('login-active')
  } else {
    document.body.classList.remove('login-active')
  }
})
</script>

<style lang="scss" scoped>
/* Reset & Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.first-page {
  --color-bg: #000000;
  --color-bg-elevated: #0a0a0a;
  --color-bg-card: #111111;
  --color-border: #1a1a1a;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #666666;
  --color-accent: #10b981;
  --color-accent-hover: #059669;
  --color-gradient-start: #10b981;
  --color-gradient-end: #34d399;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'Monaco', 'Courier New', monospace;
  scroll-behavior: smooth;
  font-family: var(--font-sans);
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  /* Header */
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--color-border);
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }

  .nav-left {
    display: flex;
    align-items: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }

  .logo-image {
    height: 24px;
    width: auto;
    transition: transform 0.3s ease;
  }

  .logo:hover .logo-image {
    transform: scale(1.05);
  }

  .logo-text {
    color: var(--color-text-primary);
    font-weight: 600;
    font-size: 1.1rem;
    letter-spacing: 0.5px;
  }

  .logo-icon {
    font-size: 1.5rem;
  }

  .nav-center {
    display: flex;
    gap: 2rem;
    align-items: center;
  }

  .nav-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-link:hover {
    color: var(--color-text-primary);
  }

  .badge {
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    color: white;
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-weight: 500;
  }

  .nav-right {
    display: flex;
    gap: 0.75rem;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-secondary:hover {
    background: var(--color-bg-card);
    border-color: var(--color-text-tertiary);
  }

  .idea-plugin-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .idea-icon {
    width: 20px;
    height: 20px;
  }

  .btn-primary {
    position: relative;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    border: 1px solid rgba(52, 211, 153, 0.3);
    color: white;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .btn-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.4s;
  }

  .btn-primary:hover::before {
    left: 100%;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border-color: rgba(52, 211, 153, 0.5);
  }

  /* Hero Section */
  .hero {
    position: relative;
    padding: 10rem 0 6rem;
    overflow: hidden;
  }

  .hero-content {
    text-align: center;
    position: relative;
    z-index: 10;
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin-bottom: 2.5rem;
    max-width: 48rem;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 4rem;
  }

  .btn-hero-primary {
    position: relative;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    border: 1px solid rgba(52, 211, 153, 0.3);
    color: white;
    padding: 0.875rem 2rem;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    overflow: hidden;
    letter-spacing: 0.3px;
    backdrop-filter: blur(10px);
  }

  .btn-hero-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .btn-hero-primary:hover::before {
    left: 100%;
  }

  .btn-hero-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border-color: rgba(52, 211, 153, 0.5);
  }

  .btn-hero-primary:active {
    transform: translateY(-1px);
  }

  .btn-hero-secondary {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 1rem 2rem;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: inline-block;
    text-decoration: none;
  }

  .btn-hero-secondary:hover {
    background: var(--color-bg-elevated);
    border-color: var(--color-text-tertiary);
  }

  .hero-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3rem;
  }

  .stat-item {
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  .stat-divider {
    width: 1px;
    height: 3rem;
    background: var(--color-border);
  }

  .hero-demo {
    max-width: 106rem;
    margin: 2rem auto 0;
    position: relative;
    z-index: 10;
  }

  .demo-window {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .window-header {
    background: var(--color-bg-elevated);
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .window-dots {
    display: flex;
    gap: 0.5rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .dot-red {
    background: #ff5f56;
  }

  .dot-yellow {
    background: #ffbd2e;
  }

  .dot-green {
    background: #27c93f;
  }

  .window-title {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .window-content {
    padding: 2rem;
  }

  .code {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    line-height: 1.8;
    color: var(--color-text-secondary);
  }

  .code-keyword {
    color: #c678dd;
  }

  .code-function {
    color: #61afef;
  }

  .code-string {
    color: #98c379;
  }

  .code-variable {
    color: #e06c75;
  }

  .code-property {
    color: #d19a66;
  }

  .code-comment {
    color: #5c6370;
    font-style: italic;
  }

  /* Hero Background */
  .hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: linear-gradient(to bottom, white, transparent);
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.3;
  }

  .glow-1 {
    width: 600px;
    height: 600px;
    background: var(--color-gradient-start);
    top: -200px;
    left: -200px;
  }

  .glow-2 {
    width: 600px;
    height: 600px;
    background: var(--color-gradient-end);
    top: -200px;
    right: -200px;
  }

  /* Features Section */
  .features {
    padding: 6rem 0;
    background: var(--color-bg-elevated);
    position: relative;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .section-subtitle {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }

  .feature-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
    transition: all 0.3s;
  }

  .feature-card:hover {
    border-color: var(--color-accent);
    transform: translateY(-4px);
    box-shadow: 0 10px 40px rgba(16, 185, 129, 0.1);
  }

  .feature-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    color: white;
  }

  .feature-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .feature-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.7;
  }

  .feature-list {
    list-style: none;
  }

  .feature-list li {
    color: var(--color-text-secondary);
    padding-left: 1.5rem;
    position: relative;
    margin-bottom: 0.5rem;
  }

  .feature-list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--color-accent);
    font-weight: bold;
  }

  /* Tech Stack Section */
  .tech-stack {
    padding: 6rem 0;
    background: var(--color-bg);
  }

  .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 2rem;
  }

  .tech-item {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    transition: all 0.3s;
  }

  .tech-item:hover {
    border-color: var(--color-accent);
    transform: translateY(-4px);
  }

  .tech-logo {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tech-description {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  /* CTA Section */
  .cta {
    padding: 6rem 0;
    background: var(--color-bg-elevated);
    position: relative;
    overflow: hidden;
  }

  .cta-content {
    text-align: center;
    position: relative;
    z-index: 10;
  }

  .cta-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .cta-subtitle {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin-bottom: 3rem;
  }

  .cta-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 64rem;
    margin: 0 auto;
  }

  .cta-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
    transition: all 0.3s;
  }

  .cta-card:hover {
    border-color: var(--color-accent);
    transform: translateY(-4px);
  }

  .cta-card-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .cta-card-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .cta-card-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }

  .cta-code {
    display: block;
    background: var(--color-bg);
    color: var(--color-accent);
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    border: 1px solid var(--color-border);
  }

  .cta-card-button {
    background: var(--color-accent);
    border: none;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
  }

  .cta-card-button:hover {
    background: var(--color-accent-hover);
  }

  .cta-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .glow-3 {
    width: 800px;
    height: 800px;
    background: var(--color-gradient-start);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  /* Footer */
  .footer {
    padding: 4rem 0 2rem;
    background: var(--color-bg);
    border-top: 1px solid var(--color-border);
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    margin-bottom: 3rem;
  }

  .footer-left {
    max-width: 20rem;
  }

  .footer-logo {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }

  .footer-logo-image {
    height: 32px;
    width: auto;
  }

  .footer-description {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .footer-links {
    display: flex;
    gap: 4rem;
  }

  .footer-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .footer-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .footer-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }

  .footer-link:hover {
    color: var(--color-text-primary);
  }

  .footer-bottom {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid var(--color-border);
  }

  .footer-copyright {
    color: var(--color-text-tertiary);
    font-size: 0.9rem;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .nav-center {
      display: none;
    }

    .hero-title {
      font-size: 3rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .hero {
      padding: 6rem 0 4rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .hero-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-stats {
      flex-direction: column;
      gap: 2rem;
    }

    .stat-divider {
      display: none;
    }

    .section-title {
      font-size: 2rem;
    }

    .footer-content {
      flex-direction: column;
      gap: 3rem;
    }

    .footer-links {
      gap: 2rem;
    }
  }

  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .hero-content,
  .hero-demo {
    animation: fadeInUp 0.8s ease-out;
  }

  .feature-card {
    animation: fadeInUp 0.8s ease-out;
    animation-fill-mode: both;
  }

  .feature-card:nth-child(1) {
    animation-delay: 0.1s;
  }

  .feature-card:nth-child(2) {
    animation-delay: 0.2s;
  }

  .feature-card:nth-child(3) {
    animation-delay: 0.3s;
  }

  .feature-card:nth-child(4) {
    animation-delay: 0.4s;
  }

  .feature-card:nth-child(5) {
    animation-delay: 0.5s;
  }

  .feature-card:nth-child(6) {
    animation-delay: 0.6s;
  }

  /* ========================================
   Login Panel Styles
   ======================================== */

  /* Main Wrapper - Page Slide Effect */
  .main-wrapper {
    transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1),
      filter 0.8s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center center;
  }

  /* Login Panel Container */
  .login-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    max-width: 550px;
    height: 100vh;
    background: rgba(10, 10, 10, 0.98);
    backdrop-filter: blur(40px);
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    box-shadow: -20px 0 80px rgba(0, 0, 0, 0.8);
  }

  /* Close Button */
  .login-close {
    position: absolute;
    top: 2rem;
    right: 2rem;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.15);
    /* 增加背景不透明度，更容易看到 */
    border: 2px solid rgba(255, 255, 255, 0.3);
    /* 增加边框宽度和不透明度 */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-text-primary);
    /* 改为主文字颜色，更明显 */
    transition: all 0.3s;
    z-index: 2100;
    pointer-events: auto;
    opacity: 1;
    visibility: visible;
  }

  .login-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
    transform: rotate(90deg);
    border-color: var(--color-accent);
  }

  /* Login Content */
  .login-content {
    position: relative;
    z-index: 10;
    padding: 4rem 3rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* Login Header */
  .login-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .login-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .login-logo-image {
    height: 40px;
    width: auto;
  }

  .login-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .login-subtitle {
    color: var(--color-text-secondary);
    font-size: 1rem;
  }

  /* Login Form */
  .login-form {
    width: 100%;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    color: var(--color-text-primary);
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 1rem;
    color: var(--color-text-tertiary);
    pointer-events: none;
  }

  .form-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
    padding: 1rem 1rem 1rem 3rem;
    border-radius: 0.75rem;
    font-size: 1rem;
    transition: all 0.3s;
    font-family: var(--font-sans);
  }

  .form-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  .form-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .password-toggle {
    position: absolute;
    right: 1rem;
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .password-toggle:hover {
    color: var(--color-text-primary);
  }

  /* Form Options */
  .form-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-input {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--color-accent);
  }

  .checkbox-label {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    user-select: none;
  }

  .forgot-link {
    color: var(--color-accent);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }

  .forgot-link:hover {
    color: var(--color-accent-hover);
  }

  /* Submit Button */
  .btn-login-submit {
    width: 100%;
    background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
    border: none;
    color: white;
    padding: 1rem 2rem;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
    margin-bottom: 2rem;
  }

  .btn-login-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 30px rgba(16, 185, 129, 0.4);
  }

  .btn-login-submit:active {
    transform: translateY(0);
  }

  /* Divider */
  .divider {
    position: relative;
    text-align: center;
    margin: 2rem 0;
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  .divider-text {
    position: relative;
    display: inline-block;
    background: rgba(10, 10, 10, 0.98);
    padding: 0 1rem;
    color: var(--color-text-tertiary);
    font-size: 0.9rem;
  }

  /* Social Login */
  .social-login {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .btn-social {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
    padding: 0.875rem 1.5rem;
    border-radius: 0.75rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-social:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--color-accent);
    transform: translateY(-2px);
  }

  /* Signup Prompt */
  .signup-prompt {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .signup-link {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }

  .signup-link:hover {
    color: var(--color-accent-hover);
  }

  /* Login Background */
  .login-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .login-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.2;
  }

  .login-glow-1 {
    width: 500px;
    height: 500px;
    background: var(--color-gradient-start);
    top: -200px;
    right: -200px;
    animation: float 8s ease-in-out infinite;
  }

  .login-glow-2 {
    width: 400px;
    height: 400px;
    background: var(--color-gradient-end);
    bottom: -150px;
    left: -150px;
    animation: float 10s ease-in-out infinite reverse;
  }

  .login-grid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.5;
  }

  /* Floating Particles */
  .login-particles {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: var(--color-accent);
    border-radius: 50%;
    opacity: 0.3;
    animation: particleFloat 15s linear infinite;
  }

  .particle:nth-child(1) {
    left: 10%;
    animation-delay: 0s;
    animation-duration: 12s;
  }

  .particle:nth-child(2) {
    left: 30%;
    animation-delay: 2s;
    animation-duration: 15s;
  }

  .particle:nth-child(3) {
    left: 50%;
    animation-delay: 4s;
    animation-duration: 18s;
  }

  .particle:nth-child(4) {
    left: 70%;
    animation-delay: 6s;
    animation-duration: 14s;
  }

  .particle:nth-child(5) {
    left: 90%;
    animation-delay: 8s;
    animation-duration: 16s;
  }
}

/* Animations */
@keyframes float {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(30px, 30px);
  }
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) scale(0);
    opacity: 0;
  }

  10% {
    opacity: 0.3;
  }

  90% {
    opacity: 0.3;
  }

  100% {
    transform: translateY(-100px) scale(1);
    opacity: 0;
  }
}

body.login-active .login-panel {
  transform: translateX(0);
}

body.login-active .main-wrapper {
  transform: translateX(-30%) scale(1);
  filter: blur(8px);
  opacity: 0.3;
  pointer-events: none;
}

/* Responsive Login Panel */
@media (max-width: 768px) {
  .login-panel {
    max-width: 100%;
  }

  body.login-active .main-wrapper {
    transform: translateX(-50%) scale(0.85);
  }

  .login-content {
    padding: 3rem 2rem;
  }

  .login-title {
    font-size: 2rem;
  }

  .social-login {
    grid-template-columns: 1fr;
  }

  .login-close {
    top: 1.5rem;
    right: 1.5rem;
  }
}

@media (max-width: 480px) {
  body.login-active .main-wrapper {
    transform: translateX(-80%) scale(0.7);
  }

  .login-content {
    padding: 2rem 1.5rem;
  }
}

/* 初始状态：隐藏并向下偏移 */
.scroll-hidden {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
  /* 性能优化 */
}

/* 激活状态：显示并归位 */
.scroll-hidden.is-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
