<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">{{ isEdit ? '编辑电影' : '添加电影' }}</h2>
          <button class="close-btn" @click="$emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form class="modal-body" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="form-label">电影名称 *</label>
            <input
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="请输入电影名称"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">上映年份 *</label>
              <input
                v-model.number="form.year"
                type="number"
                class="form-input"
                placeholder="2024"
                min="1900"
                max="2100"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">个人评分 (1-10) *</label>
              <input
                v-model.number="form.rating"
                type="number"
                class="form-input"
                placeholder="8"
                min="1"
                max="10"
                step="0.5"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">观看日期 *</label>
            <input
              v-model="form.watchDate"
              type="date"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <div class="tags-input-wrapper">
              <div class="existing-tags">
                <span
                  v-for="tag in form.tags"
                  :key="tag"
                  class="input-tag"
                >
                  {{ tag }}
                  <button type="button" class="tag-remove" @click="removeTag(tag)">×</button>
                </span>
              </div>
              <input
                v-model="tagInput"
                type="text"
                class="form-input tag-input"
                placeholder="输入标签后按回车添加"
                @keydown.enter.prevent="addTagFromInput"
                @keydown.comma.prevent="addTagFromInput"
              />
            </div>
            <div v-if="store.allTags.length > 0" class="suggested-tags">
              <span class="suggested-label">常用标签：</span>
              <button
                v-for="tag in suggestedTags"
                :key="tag"
                type="button"
                class="suggested-tag"
                :class="{ active: form.tags.includes(tag) }"
                @click="toggleSuggestedTag(tag)"
              >{{ tag }}</button>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              {{ isEdit ? '保存修改' : '添加电影' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Movie } from '@/types'
import { useMovieStore } from '@/composables/useMovieStore'

const props = defineProps<{
  visible: boolean
  movie?: Movie | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: Omit<Movie, 'id' | 'createdAt'>): void
}>()

const store = useMovieStore()

const isEdit = computed(() => !!props.movie)

const today = new Date().toISOString().slice(0, 10)

const form = ref<Omit<Movie, 'id' | 'createdAt'>>({
  title: '',
  year: new Date().getFullYear(),
  rating: 8,
  watchDate: today,
  tags: []
})

const tagInput = ref('')

const suggestedTags = computed(() =>
  store.allTags.filter((t) => !form.value.tags.includes(t)).slice(0, 10)
)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.movie) {
        form.value = {
          title: props.movie.title,
          year: props.movie.year,
          rating: props.movie.rating,
          watchDate: props.movie.watchDate,
          tags: [...props.movie.tags]
        }
      } else {
        form.value = {
          title: '',
          year: new Date().getFullYear(),
          rating: 8,
          watchDate: today,
          tags: []
        }
      }
      tagInput.value = ''
    }
  }
)

function addTagFromInput() {
  const tag = tagInput.value.trim().replace(/,$/, '')
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  const idx = form.value.tags.indexOf(tag)
  if (idx !== -1) {
    form.value.tags.splice(idx, 1)
  }
}

function toggleSuggestedTag(tag: string) {
  if (form.value.tags.includes(tag)) {
    removeTag(tag)
  } else {
    form.value.tags.push(tag)
  }
}

function handleSubmit() {
  if (!form.value.title.trim()) return
  const data = {
    ...form.value,
    title: form.value.title.trim(),
    tags: form.value.tags.filter((t) => t.trim())
  }
  emit('submit', data)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-container {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 150ms ease, color 150ms ease;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  padding: 10px 14px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(230, 137, 43, 0.15);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.tags-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: border-color 150ms ease;
}

.tags-input-wrapper:focus-within {
  border-color: var(--accent);
}

.existing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.input-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 10px;
  background-color: rgba(230, 137, 43, 0.2);
  color: var(--accent);
  border-radius: 14px;
}

.tag-remove {
  background: transparent;
  color: var(--accent);
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  display: flex;
  align-items: center;
  transition: color 150ms ease;
}

.tag-remove:hover {
  color: var(--text-primary);
}

.tag-input {
  border: none;
  background: transparent;
  padding: 4px 8px;
}

.tag-input:focus {
  box-shadow: none;
}

.suggested-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.suggested-label {
  font-size: 12px;
  color: var(--text-muted);
}

.suggested-tag {
  font-size: 12px;
  padding: 3px 10px;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 12px;
  transition: background-color 150ms ease, color 150ms ease;
}

.suggested-tag:hover {
  background-color: var(--border);
  color: var(--text-primary);
}

.suggested-tag.active {
  background-color: rgba(230, 137, 43, 0.2);
  color: var(--accent);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background-color: var(--accent);
  color: #1a1a2e;
  font-weight: 600;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background-color: var(--border);
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
