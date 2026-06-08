<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTaskStore, type Task, type Priority } from '@/store/taskStore'
import { isValidTimeRange } from '@/utils/timeUtils'

interface Props {
  visible: boolean
  editingTask?: Task | null
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  editingTask: null
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const taskStore = useTaskStore()

const title = ref('')
const priority = ref<Priority>('medium')
const startTime = ref('09:00')
const endTime = ref('10:00')
const note = ref('')

const isEditing = computed(() => !!props.editingTask)
const formTitle = computed(() => isEditing.value ? '编辑任务' : '添加任务')

const showConflictWarning = ref(false)
const conflictTasks = ref<Task[]>([])
const timeError = ref('')

watch(() => props.visible, (val) => {
  if (val) {
    if (props.editingTask) {
      title.value = props.editingTask.title
      priority.value = props.editingTask.priority
      startTime.value = props.editingTask.startTime
      endTime.value = props.editingTask.endTime
      note.value = props.editingTask.note || ''
    } else {
      resetForm()
    }
    showConflictWarning.value = false
    conflictTasks.value = []
    timeError.value = ''
  }
})

function resetForm() {
  title.value = ''
  priority.value = 'medium'
  startTime.value = '09:00'
  endTime.value = '10:00'
  note.value = ''
}

function validateTime(): boolean {
  if (!isValidTimeRange(startTime.value, endTime.value)) {
    timeError.value = '结束时间必须晚于开始时间'
    return false
  }
  timeError.value = ''
  return true
}

function handleSubmit() {
  if (!title.value.trim()) {
    return
  }
  if (!validateTime()) {
    return
  }

  const taskData = {
    title: title.value.trim(),
    priority: priority.value,
    startTime: startTime.value,
    endTime: endTime.value,
    note: note.value.trim() || undefined
  }

  let result
  if (isEditing.value && props.editingTask) {
    result = taskStore.editTask(props.editingTask.id, taskData)
  } else {
    result = taskStore.addTask(taskData)
  }

  if (result.success) {
    emit('submit')
    emit('close')
  } else {
    conflictTasks.value = result.conflicts || []
    showConflictWarning.value = true
  }
}

function handleForceSubmit() {
  const taskData = {
    title: title.value.trim(),
    priority: priority.value,
    startTime: startTime.value,
    endTime: endTime.value,
    note: note.value.trim() || undefined
  }

  if (isEditing.value && props.editingTask) {
    taskStore.forceEditTask(props.editingTask.id, taskData)
  } else {
    taskStore.forceAddTask(taskData)
  }

  emit('submit')
  emit('close')
}

function handleClose() {
  emit('close')
}

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
    handleClose()
  }
}

const priorityOptions: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'high', label: '高优先级', color: '#ef4444' },
  { value: 'medium', label: '中优先级', color: '#f97316' },
  { value: 'low', label: '低优先级', color: '#22c55e' }
]
</script>

<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container">
        <div class="modal-header">
          <h2>{{ formTitle }}</h2>
          <button class="close-btn" @click="handleClose">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>任务标题</label>
            <input
              v-model="title"
              type="text"
              class="form-input"
              placeholder="请输入任务标题"
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label>优先级</label>
            <div class="priority-options">
              <button
                v-for="option in priorityOptions"
                :key="option.value"
                class="priority-btn"
                :class="{ active: priority === option.value }"
                :style="{ '--priority-color': option.color }"
                @click="priority = option.value"
              >
                <span class="priority-dot"></span>
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>开始时间</label>
              <input
                v-model="startTime"
                type="time"
                class="form-input"
                @change="validateTime"
              />
            </div>
            <div class="form-group">
              <label>结束时间</label>
              <input
                v-model="endTime"
                type="time"
                class="form-input"
                @change="validateTime"
              />
            </div>
          </div>
          <div v-if="timeError" class="error-message">{{ timeError }}</div>

          <div class="form-group">
            <label>备注（可选）</label>
            <textarea
              v-model="note"
              class="form-textarea"
              placeholder="添加备注信息..."
              rows="3"
              maxlength="200"
            ></textarea>
          </div>

          <Transition name="fade">
            <div v-if="showConflictWarning" class="conflict-warning">
              <div class="warning-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div class="warning-content">
                <p class="warning-title">时间冲突警告</p>
                <p class="warning-desc">以下任务与当前任务时间重叠：</p>
                <ul class="conflict-list">
                  <li v-for="task in conflictTasks" :key="task.id">
                    {{ task.title }} ({{ task.startTime }} - {{ task.endTime }})
                  </li>
                </ul>
                <p class="warning-hint">是否仍要保存？冲突任务将高亮显示。</p>
              </div>
            </div>
          </Transition>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleClose">取消</button>
          <button
            v-if="showConflictWarning"
            class="btn btn-warning"
            @click="handleForceSubmit"
          >
            仍要保存
          </button>
          <button class="btn btn-primary" @click="handleSubmit">
            {{ isEditing ? '保存修改' : '添加任务' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
  }
}

.modal-container {
  background: #1e1e2e;
  width: 100%;
  max-width: 500px;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
  background-image: linear-gradient(180deg, #252538 0%, #1e1e2e 100%);
}

@media (min-width: 768px) {
  .modal-container {
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease-out;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: translateY(100%);
  opacity: 0;
}

@media (min-width: 768px) {
  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #d1d5db;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #6b7280;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.priority-options {
  display: flex;
  gap: 12px;
}

.priority-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #d1d5db;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.priority-btn:hover {
  border-color: var(--priority-color);
  background: rgba(255, 255, 255, 0.08);
}

.priority-btn.active {
  border-color: var(--priority-color);
  background: color-mix(in srgb, var(--priority-color) 15%, transparent);
  color: #fff;
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--priority-color);
}

.error-message {
  color: #ef4444;
  font-size: 13px;
  margin-top: -12px;
  margin-bottom: 16px;
}

.conflict-warning {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  margin-top: 8px;
}

.warning-icon {
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-content {
  flex: 1;
}

.warning-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
}

.warning-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: #d1d5db;
}

.conflict-list {
  margin: 0 0 8px;
  padding-left: 20px;
  font-size: 13px;
  color: #d1d5db;
}

.conflict-list li {
  margin-bottom: 4px;
}

.warning-hint {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-primary {
  background: #6366f1;
  color: #fff;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-warning {
  background: #ef4444;
  color: #fff;
}

.btn-warning:hover {
  background: #dc2626;
}
</style>
