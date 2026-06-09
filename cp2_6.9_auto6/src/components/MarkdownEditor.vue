<template>
  <div class="editor-container">
    <textarea
      v-model="localValue"
      class="markdown-textarea"
      placeholder="在此输入 Markdown 内容..."
      spellcheck="false"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const localValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    if (val !== localValue.value) {
      localValue.value = val
    }
  }
)

const debouncedEmit = useDebounceFn((value: string) => {
  emit('update:modelValue', value)
}, 300)

watch(localValue, (val) => {
  debouncedEmit(val)
})
</script>

<style scoped>
.editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.markdown-textarea {
  flex: 1;
  width: 100%;
  padding: 24px;
  border: none;
  outline: none;
  resize: none;
  background-color: #ffffff;
  color: #2c3e50;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  box-sizing: border-box;
}

.markdown-textarea::placeholder {
  color: #95a5a6;
}
</style>
