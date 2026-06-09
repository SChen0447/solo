<script setup lang="ts">
import type { Story } from '../storiesData'

interface Props {
  story: Story
  isActive: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="story-card" :style="{
    background: `linear-gradient(135deg, ${story.bgColor} 0%, ${story.bgColorEnd} 100%)`
  }">
    <div class="decor-layer">
      <template v-if="story.decorType === 'circle-pulse'">
        <div class="pulse-circle pulse-circle-1"></div>
        <div class="pulse-circle pulse-circle-2"></div>
        <div class="pulse-circle pulse-circle-3"></div>
      </template>
      <template v-else-if="story.decorType === 'line-grow'">
        <div class="grow-line grow-line-h"></div>
        <div class="grow-line grow-line-v"></div>
        <div class="grow-line grow-line-d"></div>
      </template>
      <template v-else-if="story.decorType === 'particle-scatter'">
        <div v-for="i in 20" :key="i" class="scatter-particle" :style="{
          '--delay': `${(i - 1) * 0.3}s`,
          '--x': `${Math.random() * 100}%`,
          '--y': `${Math.random() * 100}%`,
          '--size': `${4 + Math.random() * 8}px`
        }"></div>
      </template>
    </div>
    <div class="card-content">
      <h1 class="card-title">{{ story.title }}</h1>
      <p class="card-subtitle">{{ story.subtitle }}</p>
      <p class="card-description">{{ story.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.story-card {
  position: relative;
  width: 700px;
  max-width: 90%;
  margin: 0 auto;
  padding: 3rem 2.5rem;
  border-radius: 8px;
  box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
}

.decor-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.pulse-circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  animation: pulse 4s ease-in-out infinite;
}

.pulse-circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: -50px;
  animation-delay: 0s;
}

.pulse-circle-2 {
  width: 300px;
  height: 300px;
  bottom: -100px;
  right: -80px;
  animation-delay: 1.3s;
}

.pulse-circle-3 {
  width: 150px;
  height: 150px;
  top: 40%;
  right: 20%;
  animation-delay: 2.6s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.1;
  }
}

.grow-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.15);
}

.grow-line-h {
  height: 2px;
  width: 0;
  top: 25%;
  left: 0;
  animation: growH 3s ease-out infinite;
}

.grow-line-v {
  width: 2px;
  height: 0;
  top: 0;
  right: 30%;
  animation: growV 3s ease-out infinite 0.7s;
}

.grow-line-d {
  height: 2px;
  width: 0;
  bottom: 20%;
  right: 0;
  transform-origin: right center;
  animation: growH 3s ease-out infinite 1.4s reverse;
}

@keyframes growH {
  0%, 100% { width: 0; }
  50% { width: 100%; }
}

@keyframes growV {
  0%, 100% { height: 0; }
  50% { height: 100%; }
}

.scatter-particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  left: var(--x);
  top: var(--y);
  animation: scatter 5s ease-in-out infinite;
  animation-delay: var(--delay);
  will-change: transform, opacity;
}

@keyframes scatter {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.4;
  }
  25% {
    transform: translate(20px, -15px) scale(1.2);
    opacity: 0.6;
  }
  50% {
    transform: translate(-10px, 25px) scale(0.8);
    opacity: 0.3;
  }
  75% {
    transform: translate(15px, 10px) scale(1.1);
    opacity: 0.5;
  }
}

.card-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: #ffffff;
}

.card-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}

.card-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 1.5rem 0;
  letter-spacing: 0.03em;
}

.card-description {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  text-align: justify;
  hyphens: auto;
}

@media (max-width: 768px) {
  .story-card {
    width: 90%;
    padding: 2rem 1.5rem;
  }

  .card-title {
    font-size: 1.5rem;
  }

  .card-subtitle {
    font-size: 1rem;
  }

  .card-description {
    font-size: 0.85rem;
  }
}
</style>
