<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">
        <span class="title-icon">📜</span>
        诗画雅集
        <span class="title-icon">📜</span>
      </h1>
      <p class="app-subtitle">一翻一赏，品味千年唐诗之美</p>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main);
}

.app-header {
  text-align: center;
  padding: 32px 20px 24px;
  background: linear-gradient(180deg, rgba(250, 208, 196, 0.4) 0%, transparent 100%);
}

.app-title {
  font-size: 2.5rem;
  color: var(--text-primary);
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.app-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

.app-main {
  flex: 1;
  padding: 0 20px 100px;
}

@media (max-width: 640px) {
  .app-header {
    padding: 20px 16px 16px;
  }
  .app-title {
    font-size: 1.8rem;
    letter-spacing: 2px;
    gap: 8px;
  }
  .title-icon {
    font-size: 1.5rem;
  }
  .app-subtitle {
    font-size: 0.95rem;
  }
}
</style>
