<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Priority } from '../stores/taskStore'

interface Props {
  visible: boolean
  title: string
  description: string
  priority: Priority
  isEdit: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: { title: string; description: string; priority: Priority }): void
}>()

const localTitle = ref('')
const localDescription = ref('')
const localPriority = ref<Priority>('medium')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      localTitle.value = props.title
      localDescription.value = props.description
      localPriority.value = props.priority
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('close')
}

const handleSave = () => {
  if (!localTitle.value.trim()) return
  emit('save', {
    title: localTitle.value.trim(),
    description: localDescription.value.trim(),
    priority: localPriority.value
  })
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleClose()
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#ef4444' },
  { value: 'medium', label: '中', color: '#f59e0b' },
  { value: 'low', label: '低', color: '#10b981' }
]
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container">
          <div class="modal-header">
            <h3>{{ isEdit ? '编辑任务' : '新建任务' }}</h3>
            <button class="close-btn" @click="handleClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>任务标题</label>
              <input
                v-model="localTitle"
                type="text"
                class="form-input"
                placeholder="输入任务标题..."
                maxlength="100"
                autofocus
              />
            </div>

            <div class="form-group">
              <label>任务描述</label>
              <textarea
                v-model="localDescription"
                class="form-textarea"
                placeholder="输入任务描述（可选）..."
                rows="4"
                maxlength="500"
              />
            </div>

            <div class="form-group">
              <label>优先级</label>
              <div class="priority-group">
                <button
                  v-for="option in priorityOptions"
                  :key="option.value"
                  type="button"
                  class="priority-btn"
                  :class="{ active: localPriority === option.value }"
                  :style="{ '--pri-color': option.color }"
                  @click="localPriority = option.value"
                >
                  <span class="priority-dot"></span>
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-cancel" @click="handleClose">取消</button>
            <button class="btn btn-save" :disabled="!localTitle.trim()" @click="handleSave">
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-container {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1e293b;
}

.modal-body {
  padding: 20px 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  background: rgba(255, 255, 255, 0.7);
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
  resize: none;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #8b5cf6;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #94a3b8;
}

.priority-group {
  display: flex;
  gap: 10px;
}

.priority-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.priority-btn:hover {
  background: #fff;
}

.priority-btn.active {
  border-color: var(--pri-color);
  background: rgba(255, 255, 255, 0.9);
  color: var(--pri-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pri-color) 15%, transparent);
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--pri-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.btn {
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: #475569;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}
</style>
