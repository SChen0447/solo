<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Contract } from '@/contracts'
import { mockService } from '@/services/mockService'

const router = useRouter()
const contracts = ref<Contract[]>([])
const loading = ref(true)

const loadContracts = async () => {
  loading.value = true
  try {
    contracts.value = await mockService.getAllContracts()
  } catch (error) {
    console.error('加载合同列表失败:', error)
  } finally {
    loading.value = false
  }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    unsigned: '未签',
    partial: '部分签',
    completed: '已完成'
  }
  return labels[status] || status
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    unsigned: 'status-unsigned',
    partial: 'status-partial',
    completed: 'status-completed'
  }
  return classes[status] || ''
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const handleCardClick = (id: string) => {
  router.push(`/contracts/${id}`)
}

const handleDelete = async (e: Event, id: string) => {
  e.stopPropagation()
  if (confirm('确定要删除这份合同吗？此操作不可撤销。')) {
    await mockService.deleteContract(id)
    await loadContracts()
  }
}

const handleEdit = (e: Event, contract: Contract) => {
  e.stopPropagation()
  alert('编辑功能请在详情页中操作，即将跳转到详情页...')
  router.push(`/contracts/${contract.id}`)
}

onMounted(() => {
  loadContracts()
})
</script>

<template>
  <div class="contract-list-page">
    <div class="page-header">
      <h1 class="page-title">我的合同</h1>
      <p class="page-subtitle">共 {{ contracts.length }} 份合同</p>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="contracts.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h3 class="empty-title">暂无合同</h3>
      <p class="empty-desc">点击右上角「创建新合同」开始创建你的第一份合同</p>
    </div>

    <div v-else class="contracts-grid">
      <div
        v-for="contract in contracts"
        :key="contract.id"
        class="contract-card"
        @click="handleCardClick(contract.id)"
      >
        <div class="card-header">
          <span class="card-title" :title="contract.title">{{ contract.title }}</span>
          <div class="card-actions">
            <button
              class="icon-btn"
              title="编辑"
              @click="handleEdit($event, contract)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button
              class="icon-btn"
              title="删除"
              @click="handleDelete($event, contract.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-parties">
          <span class="party-name">{{ contract.partyA.name }}</span>
          <span class="party-arrow">↔</span>
          <span class="party-name">{{ contract.partyB.name }}</span>
        </div>

        <div class="card-footer">
          <span class="card-date">{{ formatDate(contract.createdAt) }}</span>
          <span class="status-tag" :class="getStatusClass(contract.status)">
            {{ getStatusLabel(contract.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contract-list-page {
  min-height: 100%;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  color: #ffffff;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 6px;
}

.page-subtitle {
  color: #4fc3f7;
  font-size: 14px;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-desc {
  color: #888;
  font-size: 14px;
  max-width: 320px;
}

.contracts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.contract-card {
  width: 280px;
  height: 120px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2c5f8a 100%);
  padding: 16px;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.contract-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
  pointer-events: none;
}

.contract-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  background: transparent;
  color: #e0e0e0;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.icon-btn:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.1);
}

.card-parties {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
}

.party-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.party-arrow {
  opacity: 0.7;
  flex-shrink: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-date {
  font-size: 12px;
  opacity: 0.7;
}

.status-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 10px;
}

.status-unsigned {
  background-color: rgba(244, 67, 54, 0.3);
  color: #ff8a80;
}

.status-partial {
  background-color: rgba(255, 152, 0, 0.3);
  color: #ffd180;
}

.status-completed {
  background-color: rgba(76, 175, 80, 0.3);
  color: #b9f6ca;
}

@media (max-width: 768px) {
  .contracts-grid {
    grid-template-columns: 1fr;
  }

  .contract-card {
    width: 100%;
    height: auto;
    min-height: 120px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
