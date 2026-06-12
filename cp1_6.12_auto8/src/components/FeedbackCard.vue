<script setup lang="ts">
import { computed } from 'vue'
import type { Feedback } from '@/types/feedback'

const props = defineProps<{
  feedback: Feedback
  highlighted?: boolean
}>()

const emit = defineEmits<{
  click: []
  dragstart: [e: DragEvent]
}>()

const urgencyConfig = {
  normal: { label: '普通', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  urgent: { label: '紧急', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  critical: { label: '特急', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
}

const statusConfig = {
  pending: { label: '未处理', color: '#64748b' },
  processing: { label: '处理中', color: '#3b82f6' },
  resolved: { label: '已解决', color: '#10b981' }
}

const urgencyInfo = computed(() => urgencyConfig[props.feedback.urgency])
const statusInfo = computed(() => statusConfig[props.feedback.status])

const formattedTime = computed(() => {
  const now = Date.now()
  const diff = now - props.feedback.createdAt
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    const date = new Date(props.feedback.createdAt)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
})

function handleClick() {
  emit('click')
}

function handleDragStart(e: DragEvent) {
  emit('dragstart', e)
}
</script>

<template>
  <div
    class="feedback-card"
    :class="{ highlighted }"
    @click="handleClick"
    @dragstart="handleDragStart"
    draggable="true"
  >
    <div class="card-header">
      <div class="urgency-badge" :style="{ backgroundColor: urgencyInfo.bgColor, color: urgencyInfo.color }">
        <span class="urgency-dot" :style="{ backgroundColor: urgencyInfo.color }"></span>
        {{ urgencyInfo.label }}
      </div>
      <span class="status-badge" :style="{ color: statusInfo.color }">
        {{ statusInfo.label }}
      </span>
    </div>

    <h3 class="card-title">{{ feedback.title }}</h3>

    <div class="card-meta">
      <div class="meta-item">
        <span class="meta-icon">🏢</span>
        <span class="meta-text">{{ feedback.source }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-icon">⏱️</span>
        <span class="meta-text">{{ formattedTime }}</span>
      </div>
    </div>

    <p class="card-description">{{ feedback.description.slice(0, 80) }}{{ feedback.description.length > 80 ? '...' : '' }}</p>
  </div>
</template>

<style scoped>
.feedback-card {
  background-color: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
  user-select: none;
}

.feedback-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-accent);
}

.feedback-card.highlighted {
  border-color: var(--color-accent);
  background-color: rgba(245, 158, 11, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.urgency-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.urgency-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge {
  font-size: 12px;
  font-weight: 500;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.meta-icon {
  font-size: 12px;
}

.meta-text {
  white-space: nowrap;
}

.card-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
