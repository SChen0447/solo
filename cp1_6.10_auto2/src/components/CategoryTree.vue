<template>
  <div class="category-tree">
    <div v-for="category in categories" :key="category.id">
      <div
        class="tree-node"
        :class="{
          'tree-node-active': selectedCategoryId === category.id,
          'tree-node-has-children': category.children?.length
        }"
        @click="handleSelect(category)"
      >
        <span class="node-icon">{{ category.icon }}</span>
        <span class="node-name">{{ category.name }}</span>
        <svg
          v-if="category.children?.length"
          class="node-arrow"
          :class="{ 'node-arrow-open': expandedNodes.has(category.id) }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          @click.stop="toggleExpand(category.id)"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      <transition name="slide-expand">
        <div v-if="category.children?.length && expandedNodes.has(category.id)" class="tree-children">
          <div
            v-for="child in category.children"
            :key="child.id"
            class="tree-node tree-node-child"
            :class="{ 'tree-node-active': selectedCategoryId === child.id }"
            @click="handleSelect(child)"
          >
            <span class="node-icon">{{ child.icon }}</span>
            <span class="node-name">{{ child.name }}</span>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBookStore, type Category } from '@/stores/bookStore'

const bookStore = useBookStore()

const categories = computed(() => bookStore.categories)
const selectedCategoryId = computed(() => bookStore.selectedCategoryId)

const expandedNodes = ref(new Set(['cat-1', 'cat-2', 'cat-3']))

const handleSelect = (category: Category) => {
  bookStore.setCategory(category.id)
  if (category.children?.length) {
    if (expandedNodes.value.has(category.id)) {
      expandedNodes.value.delete(category.id)
    } else {
      expandedNodes.value.add(category.id)
    }
  }
}

const toggleExpand = (id: string) => {
  if (expandedNodes.value.has(id)) {
    expandedNodes.value.delete(id)
  } else {
    expandedNodes.value.add(id)
  }
}
</script>

<style scoped>
.category-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
  color: var(--color-text);
  font-size: 14px;
}

.tree-node:hover {
  background: rgba(30, 58, 95, 0.06);
}

.tree-node-active {
  background: var(--gradient-primary);
  color: white;
}

.tree-node-active:hover {
  background: var(--gradient-primary);
}

.tree-node-child {
  padding-left: 38px;
  font-size: 13px;
}

.node-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  color: var(--color-text-light);
}

.tree-node-active .node-arrow {
  color: rgba(255, 255, 255, 0.7);
}

.node-arrow-open {
  transform: rotate(90deg);
}

.tree-children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
  overflow: hidden;
}

.slide-expand-enter-active,
.slide-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.slide-expand-enter-from,
.slide-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-expand-enter-to,
.slide-expand-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
