<template>
  <div class="search-bar">
    <div class="search-wrapper" :class="{ focused: isFocused }">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        class="search-input"
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <transition name="fade">
        <button
          v-if="modelValue"
          class="clear-btn"
          @click="handleClear"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </transition>
    </div>
    <transition name="fade">
      <div v-if="resultCount >= 0" class="result-count">
        找到 <strong>{{ resultCount }}</strong> 本相关书籍
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: string
  placeholder?: string
  resultCount?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isFocused = ref(false)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleClear = () => {
  emit('update:modelValue', '')
}
</script>

<style scoped>
.search-bar {
  width: 100%;
  max-width: 480px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  border-bottom: 2px solid var(--color-border);
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.search-wrapper.focused {
  border-bottom: 2px solid transparent;
  border-image: var(--gradient-accent) 1;
  box-shadow: var(--shadow-md);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-light);
  flex-shrink: 0;
  margin-right: 10px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--color-text);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-text-light);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--color-text-light);
  transition: var(--transition);
  flex-shrink: 0;
}

.clear-btn:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.result-count {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-light);
  padding-left: 4px;
}

.result-count strong {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
