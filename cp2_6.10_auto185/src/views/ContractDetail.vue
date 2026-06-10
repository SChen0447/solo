<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Contract } from '@/contracts'
import { mockService } from '@/services/mockService'

const route = useRoute()
const router = useRouter()
const contractId = route.params.id as string

const contract = ref<Contract | null>(null)
const loading = ref(true)
const signingPartyA = ref(false)
const signingPartyB = ref(false)

const canvasARef = ref<HTMLCanvasElement | null>(null)
const canvasBRef = ref<HTMLCanvasElement | null>(null)
const isDrawingA = ref(false)
const isDrawingB = ref(false)
const hasSignatureA = ref(false)
const hasSignatureB = ref(false)
const lastXA = ref(0)
const lastYA = ref(0)
const lastXB = ref(0)
const lastYB = ref(0)

const isPartyASigned = computed(() => {
  return contract.value?.signatures.some(s => s.party === 'partyA') || false
})

const isPartyBSigned = computed(() => {
  return contract.value?.signatures.some(s => s.party === 'partyB') || false
})

const canConfirmA = computed(() => hasSignatureA.value && !isPartyASigned.value)
const canConfirmB = computed(() => hasSignatureB.value && !isPartyBSigned.value)

const loadContract = async () => {
  loading.value = true
  try {
    const data = await mockService.getContractById(contractId)
    if (!data) {
      alert('合同不存在')
      router.push('/contracts')
      return
    }
    contract.value = data
  } catch (error) {
    console.error('加载合同详情失败:', error)
  } finally {
    loading.value = false
  }
}

const initCanvas = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
}

const clearCanvas = (canvas: HTMLCanvasElement | null, isPartyA: boolean) => {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (isPartyA) {
    hasSignatureA.value = false
  } else {
    hasSignatureB.value = false
  }
}

const getPosition = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  let clientX: number, clientY: number
  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

const startDrawing = (e: MouseEvent | TouchEvent, isPartyA: boolean) => {
  e.preventDefault()
  const canvas = isPartyA ? canvasARef.value : canvasBRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (isPartyA) {
    isDrawingA.value = true
    const pos = getPosition(e, canvas)
    lastXA.value = pos.x
    lastYA.value = pos.y
  } else {
    isDrawingB.value = true
    const pos = getPosition(e, canvas)
    lastXB.value = pos.x
    lastYB.value = pos.y
  }
}

const draw = (e: MouseEvent | TouchEvent, isPartyA: boolean) => {
  e.preventDefault()
  const canvas = isPartyA ? canvasARef.value : canvasBRef.value
  if (!canvas) return

  const isDrawing = isPartyA ? isDrawingA.value : isDrawingB.value
  if (!isDrawing) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const pos = getPosition(e, canvas)
  if (isPartyA) {
    ctx.beginPath()
    ctx.moveTo(lastXA.value, lastYA.value)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastXA.value = pos.x
    lastYA.value = pos.y
    hasSignatureA.value = true
  } else {
    ctx.beginPath()
    ctx.moveTo(lastXB.value, lastYB.value)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastXB.value = pos.x
    lastYB.value = pos.y
    hasSignatureB.value = true
  }
}

const stopDrawing = (isPartyA: boolean) => {
  if (isPartyA) {
    isDrawingA.value = false
  } else {
    isDrawingB.value = false
  }
}

const confirmSignature = async (isPartyA: boolean) => {
  const canvas = isPartyA ? canvasARef.value : canvasBRef.value
  if (!canvas || !contract.value) return

  const dataUrl = canvas.toDataURL('image/png')
  const party = isPartyA ? 'partyA' : 'partyB'

  try {
    const updated = await mockService.signContract(contract.value.id, party, dataUrl)
    if (updated) {
      contract.value = updated
      hasSignatureA.value = false
      hasSignatureB.value = false
    }
  } catch (error) {
    console.error('签署失败:', error)
    alert('签署失败，请重试')
  }
}

const downloadPDF = async () => {
  if (!contract.value) return
  try {
    await mockService.generatePDF(contract.value)
  } catch (error) {
    console.error('生成PDF失败:', error)
    alert('生成PDF失败，请重试')
  }
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getSignatureDataUrl = (isPartyA: boolean): string => {
  if (!contract.value) return ''
  const party = isPartyA ? 'partyA' : 'partyB'
  const sig = contract.value.signatures.find(s => s.party === party)
  return sig?.dataUrl || ''
}

onMounted(async () => {
  await loadContract()
  await nextTick()
  initCanvas(canvasARef.value)
  initCanvas(canvasBRef.value)
})
</script>

<template>
  <div class="detail-page">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <template v-else-if="contract">
      <button class="back-btn" @click="router.push('/contracts')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        返回列表
      </button>

      <h1 class="detail-title">{{ contract.title }}</h1>

      <div class="detail-layout">
        <div class="contract-content">
          <div class="contract-meta">
            <div class="meta-item">
              <span class="meta-label">甲方</span>
              <span class="meta-value">{{ contract.partyA.name }} ({{ contract.partyA.email }})</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">乙方</span>
              <span class="meta-value">{{ contract.partyB.name }} ({{ contract.partyB.email }})</span>
            </div>
          </div>

          <div class="contract-body" v-html="contract.content"></div>
        </div>

        <div class="signature-section">
          <h3 class="section-title">签名区域</h3>

          <div class="signature-block">
            <div class="signer-info">
              <span class="signer-label">甲方</span>
              <span class="signer-name">{{ contract.partyA.name }}</span>
              <span v-if="isPartyASigned" class="signed-badge">✓ 已签署</span>
            </div>

            <div class="signature-box">
              <img
                v-if="isPartyASigned && getSignatureDataUrl(true)"
                :src="getSignatureDataUrl(true)"
                class="signature-image"
                alt="甲方签名"
              />
              <canvas
                v-else
                ref="canvasARef"
                width="400"
                height="120"
                class="signature-canvas"
                @mousedown="startDrawing($event, true)"
                @mousemove="draw($event, true)"
                @mouseup="stopDrawing(true)"
                @mouseleave="stopDrawing(true)"
                @touchstart="startDrawing($event, true)"
                @touchmove="draw($event, true)"
                @touchend="stopDrawing(true)"
              ></canvas>
            </div>

            <div class="signature-actions">
              <button
                class="clear-btn"
                :disabled="isPartyASigned || !hasSignatureA"
                @click="clearCanvas(canvasARef, true)"
                title="清除签名"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button
                class="confirm-btn"
                :disabled="!canConfirmA"
                @click="confirmSignature(true)"
              >
                确认签署
              </button>
            </div>
          </div>

          <div class="signature-block">
            <div class="signer-info">
              <span class="signer-label">乙方</span>
              <span class="signer-name">{{ contract.partyB.name }}</span>
              <span v-if="isPartyBSigned" class="signed-badge">✓ 已签署</span>
            </div>

            <div class="signature-box">
              <img
                v-if="isPartyBSigned && getSignatureDataUrl(false)"
                :src="getSignatureDataUrl(false)"
                class="signature-image"
                alt="乙方签名"
              />
              <canvas
                v-else
                ref="canvasBRef"
                width="400"
                height="120"
                class="signature-canvas"
                @mousedown="startDrawing($event, false)"
                @mousemove="draw($event, false)"
                @mouseup="stopDrawing(false)"
                @mouseleave="stopDrawing(false)"
                @touchstart="startDrawing($event, false)"
                @touchmove="draw($event, false)"
                @touchend="stopDrawing(false)"
              ></canvas>
            </div>

            <div class="signature-actions">
              <button
                class="clear-btn"
                :disabled="isPartyBSigned || !hasSignatureB"
                @click="clearCanvas(canvasBRef, false)"
                title="清除签名"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button
                class="confirm-btn"
                :disabled="!canConfirmB"
                @click="confirmSignature(false)"
              >
                确认签署
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="history-section">
        <h3 class="section-title">签署履历</h3>
        <div class="history-list">
          <div v-if="contract.signRecords.length === 0" class="history-empty">
            暂无签署记录
          </div>
          <div
            v-for="record in contract.signRecords"
            :key="record.id"
            class="history-item"
          >
            <span class="history-dot"></span>
            <span class="history-action">{{ record.action }}</span>
            <span class="history-time">{{ formatTimestamp(record.timestamp) }}</span>
          </div>
        </div>
      </div>

      <button class="download-fab" @click="downloadPDF" title="下载PDF">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
      </button>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  position: relative;
  min-height: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(79, 195, 247, 0.2);
  border-top-color: #4fc3f7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #e0e0e0;
  font-size: 14px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: #4fc3f7;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.back-btn:hover {
  background-color: rgba(79, 195, 247, 0.1);
}

.detail-title {
  color: #ffffff;
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 28px;
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 28px;
  margin-bottom: 32px;
}

.contract-content {
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
  color: #333;
}

.contract-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ddd;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  flex-shrink: 0;
  min-width: 36px;
}

.meta-value {
  font-size: 14px;
  color: #333;
}

.contract-body {
  line-height: 1.8;
  font-size: 14px;
}

.contract-body :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin-top: 16px;
  margin-bottom: 8px;
  color: #222;
}

.contract-body :deep(p) {
  margin-bottom: 8px;
  color: #444;
}

.signature-section {
  background-color: #16213e;
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.signature-block {
  margin-bottom: 28px;
}

.signature-block:last-child {
  margin-bottom: 0;
}

.signer-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.signer-label {
  font-size: 13px;
  font-weight: 600;
  color: #4fc3f7;
  background-color: rgba(79, 195, 247, 0.15);
  padding: 3px 10px;
  border-radius: 4px;
}

.signer-name {
  font-size: 15px;
  color: #ffffff;
  font-weight: 500;
}

.signed-badge {
  font-size: 12px;
  color: #b9f6ca;
  background-color: rgba(76, 175, 80, 0.2);
  padding: 3px 10px;
  border-radius: 4px;
}

.signature-box {
  width: 200px;
  height: 60px;
  border: 1.5px dashed #9e9e9e;
  border-radius: 4px;
  background-color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.signature-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.signature-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.signature-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.clear-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #e57373;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover:not(:disabled) {
  background-color: #ef5350;
}

.clear-btn:disabled {
  background-color: #bdbdbd;
}

.confirm-btn {
  background-color: #4caf50;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 20px;
  border-radius: 6px;
}

.confirm-btn:hover:not(:disabled) {
  background-color: #43a047;
}

.confirm-btn:disabled {
  background-color: #bdbdbd;
}

.history-section {
  background-color: #16213e;
  border-radius: 12px;
  padding: 24px;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-list::-webkit-scrollbar {
  width: 4px;
}

.history-list::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
  background: #4fc3f7;
  border-radius: 2px;
}

.history-empty {
  color: #888;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.history-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #4caf50;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.15);
}

.history-action {
  flex: 1;
  color: #e0e0e0;
  font-size: 14px;
}

.history-time {
  color: #888;
  font-size: 13px;
  font-family: 'SF Mono', Menlo, monospace;
  flex-shrink: 0;
}

.download-fab {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #ff5722;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(255, 87, 34, 0.4);
  z-index: 50;
}

.download-fab:hover {
  background-color: #f4511e;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 87, 34, 0.5);
}

@media (max-width: 768px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .signature-section {
    order: -1;
  }

  .signature-box {
    width: 100%;
    max-width: 280px;
  }

  .detail-title {
    font-size: 20px;
  }

  .download-fab {
    right: 20px;
    bottom: 20px;
    width: 44px;
    height: 44px;
  }
}
</style>
