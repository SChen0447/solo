<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { ColorItem, TemplateType } from '../types'
import { getContrastColor, darkenColor, lightenColor } from '../utils/colorUtils'

const props = defineProps<{
  colors: ColorItem[]
  template: TemplateType
  schemeName: string
  isFullscreen: boolean
  isMobile: boolean
}>()

const emit = defineEmits<{
  'update:template': [t: TemplateType]
  'update:isFullscreen': [val: boolean]
  'update:colors': [colors: ColorItem[]]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const templateRef = ref<HTMLElement | null>(null)

const templates: { key: TemplateType; label: string }[] = [
  { key: 'blog', label: '博客卡片' },
  { key: 'product', label: '产品详情' },
  { key: 'login', label: '登录弹窗' }
]

const c = computed(() => ({
  primary: props.colors[0]?.hex || '#4a90d9',
  secondary: props.colors[1]?.hex || '#50c878',
  accent: props.colors[2]?.hex || '#ff6b6b',
  background: props.colors[3]?.hex || '#f8f9fa',
  surface: props.colors[4]?.hex || '#ffffff',
  text: props.colors[5]?.hex || '#2d2d2d'
}))

const toggleFullscreen = () => {
  emit('update:isFullscreen', !props.isFullscreen)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isFullscreen) {
    emit('update:isFullscreen', false)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const downloadCanvas = async () => {
  await nextTick()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = 1200
  canvas.height = 800

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1200, 800)

  const palette = props.colors
  const name = props.schemeName || '未命名方案'

  ctx.fillStyle = '#2d2d2d'
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(name, 60, 60)

  ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#999'
  ctx.fillText(`配色方案 - ${new Date().toLocaleDateString()}`, 60, 90)

  const swatchSize = 80
  const swatchGap = 24
  const startX = 60
  const startY = 140

  palette.forEach((color, i) => {
    const x = startX + i * (swatchSize + swatchGap)
    const y = startY

    ctx.fillStyle = color.hex
    ctx.beginPath()
    ctx.roundRect(x, y, swatchSize, swatchSize, 12)
    ctx.fill()

    ctx.fillStyle = '#666'
    ctx.font = '13px SF Mono, Monaco, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(color.hex.toUpperCase(), x + swatchSize / 2, y + swatchSize + 22)
    ctx.textAlign = 'left'
  })

  drawTemplatePreview(ctx, 60, 260)

  const link = document.createElement('a')
  link.download = `${name || 'palette'}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const drawTemplatePreview = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const colors = c.value
  const cardX = x
  const cardY = y
  const cardW = 1080
  const cardH = 480

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 4

  ctx.fillStyle = colors.surface
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, 16)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = colors.text
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('模板预览效果', cardX + 32, cardY + 48)

  const navY = cardY + 80
  const navH = 48
  ctx.fillStyle = colors.primary
  ctx.beginPath()
  ctx.roundRect(cardX + 32, navY, cardW - 64, navH, 10)
  ctx.fill()

  ctx.fillStyle = getContrastColor(colors.primary)
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('LOGO', cardX + 52, navY + 30)

  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('首页', cardX + 140, navY + 30)
  ctx.fillText('产品', cardX + 200, navY + 30)
  ctx.fillText('关于', cardX + 260, navY + 30)

  const contentY = navY + navH + 32

  ctx.fillStyle = colors.background
  ctx.beginPath()
  ctx.roundRect(cardX + 32, contentY, 320, 280, 12)
  ctx.fill()

  ctx.fillStyle = colors.secondary
  ctx.beginPath()
  ctx.roundRect(cardX + 32, contentY, 320, 120, 12)
  ctx.fill()

  ctx.fillStyle = colors.text
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('博客文章标题', cardX + 48, contentY + 156)

  ctx.fillStyle = '#999'
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('这是一段描述文字，用于展示配色方案在文本...', cardX + 48, contentY + 180, 280)

  ctx.fillStyle = colors.accent
  ctx.beginPath()
  ctx.roundRect(cardX + 48, contentY + 216, 96, 36, 8)
  ctx.fill()
  ctx.fillStyle = getContrastColor(colors.accent)
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('阅读更多', cardX + 62, contentY + 239)

  const btnX = cardX + 400
  ctx.fillStyle = colors.primary
  ctx.beginPath()
  ctx.roundRect(btnX, contentY, 100, 40, 8)
  ctx.fill()
  ctx.fillStyle = getContrastColor(colors.primary)
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('主要按钮', btnX + 20, contentY + 26)

  ctx.fillStyle = colors.surface
  ctx.strokeStyle = colors.primary
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(btnX + 120, contentY, 100, 40, 8)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = colors.primary
  ctx.fillText('次要按钮', btnX + 138, contentY + 26)

  ctx.fillStyle = colors.secondary
  ctx.beginPath()
  ctx.roundRect(btnX + 240, contentY, 100, 40, 8)
  ctx.fill()
  ctx.fillStyle = getContrastColor(colors.secondary)
  ctx.fillText('成功按钮', btnX + 258, contentY + 26)

  ctx.strokeStyle = colors.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(btnX + 360, contentY, 100, 40, 8)
  ctx.fill()
  ctx.strokeStyle = colors.accent
  ctx.stroke()
  ctx.fillStyle = colors.accent
  ctx.fillText('警告按钮', btnX + 378, contentY + 26)

  ctx.fillStyle = colors.text
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('表单组件', btnX, contentY + 80)

  ctx.fillStyle = colors.background
  ctx.beginPath()
  ctx.roundRect(btnX, contentY + 96, 300, 40, 8)
  ctx.fill()
  ctx.fillStyle = '#999'
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('请输入内容...', btnX + 16, contentY + 122)

  ctx.fillStyle = colors.background
  ctx.beginPath()
  ctx.roundRect(btnX, contentY + 152, 300, 40, 8)
  ctx.fill()
  ctx.fillStyle = '#999'
  ctx.fillText('请输入密码...', btnX + 16, contentY + 178)

  ctx.fillStyle = colors.primary
  ctx.beginPath()
  ctx.roundRect(btnX, contentY + 208, 300, 44, 8)
  ctx.fill()
  ctx.fillStyle = getContrastColor(colors.primary)
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('提交', btnX + 150, contentY + 236)
  ctx.textAlign = 'left'
}

watch(
  () => props.schemeName,
  () => {},
  { immediate: true }
)

defineExpose({ downloadCanvas })
</script>

<template>
  <div class="demo-viewer" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="viewer-header">
      <div class="template-tabs">
        <button
          v-for="t in templates"
          :key="t.key"
          class="tab-btn"
          :class="{ active: template === t.key }"
          @click="emit('update:template', t.key)"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="downloadCanvas" title="下载PNG">
          <i class="fas fa-download"></i>
        </button>
        <button class="icon-btn" @click="toggleFullscreen" title="全屏展示">
          <i :class="isFullscreen ? 'fas fa-compress' : 'fas fa-expand'"></i>
        </button>
      </div>
    </div>

    <div class="template-container">
      <div ref="templateRef" class="template-wrapper" :style="{ transition: 'all 0.3s ease-in-out' }">
        <template v-if="template === 'blog'">
          <div class="blog-card" :style="{ background: c.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }">
            <div class="blog-image" :style="{ background: c.secondary }">
              <i class="fas fa-image" :style="{ color: getContrastColor(c.secondary) }"></i>
            </div>
            <div class="blog-content">
              <span class="blog-tag" :style="{ background: c.primary, color: getContrastColor(c.primary) }">设计</span>
              <h3 class="blog-title" :style="{ color: c.text }">探索现代配色方案的艺术</h3>
              <p class="blog-desc" :style="{ color: '#666' }">
                色彩是设计的灵魂，一组好的配色能够传达情感、引导视线，并创造令人难忘的视觉体验。
              </p>
              <div class="blog-footer">
                <div class="author">
                  <div class="avatar" :style="{ background: c.accent }"></div>
                  <span class="author-name" :style="{ color: c.text }">设计师</span>
                </div>
                <button class="blog-btn" :style="{ background: c.accent, color: getContrastColor(c.accent) }">
                  阅读
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="template === 'product'">
          <div class="product-card" :style="{ background: c.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }">
            <div class="product-gallery">
              <div class="main-image" :style="{ background: c.primary }">
                <i class="fas fa-box" :style="{ color: getContrastColor(c.primary) }"></i>
              </div>
              <div class="thumbnails">
                <div class="thumb" :style="{ background: c.secondary }"></div>
                <div class="thumb" :style="{ background: c.accent }"></div>
                <div class="thumb" :style="{ background: c.background, border: '1px solid #ddd' }"></div>
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-title" :style="{ color: c.text }">高级设计工具套装</h3>
              <div class="product-rating">
                <i class="fas fa-star" :style="{ color: '#ffc107' }"></i>
                <i class="fas fa-star" :style="{ color: '#ffc107' }"></i>
                <i class="fas fa-star" :style="{ color: '#ffc107' }"></i>
                <i class="fas fa-star" :style="{ color: '#ffc107' }"></i>
                <i class="fas fa-star-half-alt" :style="{ color: '#ffc107' }"></i>
                <span style="color: #999; font-size: 13px; margin-left: 8px;">(128 评价)</span>
              </div>
              <p class="product-desc" :style="{ color: '#666' }">
                专为专业设计师打造的高端工具套装，提升您的创作效率。
              </p>
              <div class="product-colors">
                <span class="color-label" :style="{ color: c.text }">颜色：</span>
                <span class="color-dot" :style="{ background: c.primary }"></span>
                <span class="color-dot" :style="{ background: c.secondary }"></span>
                <span class="color-dot" :style="{ background: c.accent }"></span>
              </div>
              <div class="product-footer">
                <span class="price" :style="{ color: c.primary }">¥ 1,299</span>
                <button class="buy-btn" :style="{ background: c.accent, color: getContrastColor(c.accent) }">
                  <i class="fas fa-shopping-cart"></i> 购买
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="login-card" :style="{ background: c.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }">
            <div class="login-header">
              <div class="logo-circle" :style="{ background: c.primary }">
                <i class="fas fa-palette" :style="{ color: getContrastColor(c.primary) }"></i>
              </div>
              <h3 class="login-title" :style="{ color: c.text }">欢迎回来</h3>
              <p class="login-subtitle" :style="{ color: '#999' }">登录您的账户继续创作</p>
            </div>
            <div class="login-form">
              <div class="form-group">
                <label class="form-label" :style="{ color: c.text }">邮箱地址</label>
                <div class="input-wrapper" :style="{ background: c.background }">
                  <i class="fas fa-envelope" :style="{ color: '#999' }"></i>
                  <input type="email" placeholder="your@email.com" style="background: transparent; border: none; outline: none; flex: 1; font-size: 14px;" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" :style="{ color: c.text }">密码</label>
                <div class="input-wrapper" :style="{ background: c.background }">
                  <i class="fas fa-lock" :style="{ color: '#999' }"></i>
                  <input type="password" placeholder="••••••••" style="background: transparent; border: none; outline: none; flex: 1; font-size: 14px;" />
                </div>
              </div>
              <div class="form-options">
                <label class="remember">
                  <input type="checkbox" />
                  <span :style="{ color: '#666' }">记住我</span>
                </label>
                <a class="forgot" :style="{ color: c.primary }">忘记密码？</a>
              </div>
              <button class="login-btn" :style="{ background: c.primary, color: getContrastColor(c.primary) }">
                登录
              </button>
              <div class="login-divider">
                <span :style="{ color: '#999' }">或使用以下方式</span>
              </div>
              <div class="social-login">
                <button class="social-btn" :style="{ background: c.background, color: c.text }">
                  <i class="fab fa-google"></i>
                </button>
                <button class="social-btn" :style="{ background: c.background, color: c.text }">
                  <i class="fab fa-github"></i>
                </button>
                <button class="social-btn" :style="{ background: c.background, color: c.text }">
                  <i class="fab fa-weixin"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <canvas ref="canvasRef" style="display: none;"></canvas>
  </div>
</template>

<style scoped>
.demo-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.is-fullscreen.demo-viewer {
  background: transparent;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  flex-shrink: 0;
}

.template-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.tab-btn:hover {
  transform: scale(1.05);
}

.tab-btn.active {
  background: #2d2d2d;
  color: #fff;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-out;
}

.icon-btn:hover {
  background: #e8e8e8;
  transform: scale(1.05);
  color: #333;
}

.template-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}

.template-wrapper {
  width: 320px;
}

.blog-card {
  border-radius: 16px;
  overflow: hidden;
}

.blog-image {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

.blog-content {
  padding: 20px;
}

.blog-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 12px;
}

.blog-title {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}

.blog-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  line-height: 1.6;
}

.blog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
}

.blog-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.blog-btn:hover {
  transform: scale(1.05);
}

.product-card {
  border-radius: 16px;
  overflow: hidden;
  width: 320px;
}

.product-gallery {
  padding: 20px;
}

.main-image {
  width: 100%;
  height: 160px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  margin-bottom: 12px;
}

.thumbnails {
  display: flex;
  gap: 8px;
}

.thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease-out;
}

.thumb:hover {
  transform: scale(1.05);
}

.product-info {
  padding: 0 20px 20px 20px;
}

.product-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
}

.product-rating {
  margin-bottom: 12px;
  font-size: 14px;
}

.product-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  line-height: 1.6;
}

.product-colors {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.color-label {
  font-size: 13px;
  font-weight: 500;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease-out;
}

.color-dot:hover {
  transform: scale(1.15);
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price {
  font-size: 22px;
  font-weight: 700;
}

.buy-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease-out;
}

.buy-btn:hover {
  transform: scale(1.05);
}

.login-card {
  border-radius: 16px;
  padding: 32px 28px;
  width: 320px;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-circle {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 16px;
}

.login-title {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 700;
}

.login-subtitle {
  margin: 0;
  font-size: 13px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 12px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.forgot {
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.login-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-out;
  margin-bottom: 20px;
}

.login-btn:hover {
  transform: scale(1.02);
}

.login-divider {
  text-align: center;
  position: relative;
  margin-bottom: 20px;
}

.login-divider::before,
.login-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 35%;
  height: 1px;
  background: #eee;
}

.login-divider::before {
  left: 0;
}

.login-divider::after {
  right: 0;
}

.login-divider span {
  font-size: 12px;
}

.social-login {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.social-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease-out;
}

.social-btn:hover {
  transform: scale(1.08);
}

@media (max-width: 768px) {
  .viewer-header {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .template-tabs {
    flex: 1;
    overflow-x: auto;
  }

  .tab-btn {
    flex-shrink: 0;
  }
}
</style>
