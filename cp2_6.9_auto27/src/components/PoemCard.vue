<template>
  <div
    class="poem-card-wrapper"
    :style="{ animationDelay: `${delay}ms` }"
  >
    <div
      class="poem-card"
      :class="{ 'is-flipped': isFlipped }"
      @click="handleCardClick"
      :style="{ boxShadow: shadowStyle }"
    >
      <div class="card-face card-front">
        <span v-if="isFavorite" class="favorite-star" @click.stop="toggleFavorite">
          ★
        </span>
        <div class="front-decoration top-left"></div>
        <div class="front-decoration top-right"></div>
        <div class="front-decoration bottom-left"></div>
        <div class="front-decoration bottom-right"></div>
        <div class="card-content">
          <h3 class="poem-title">{{ poem.title }}</h3>
          <p class="poem-author">—— {{ poem.author }} ——</p>
          <p class="poem-verse">{{ poem.verse }}</p>
          <div class="flip-hint">
            <span class="hint-icon">👆</span>
            <span>点击翻开</span>
          </div>
        </div>
      </div>

      <div class="card-face card-back">
        <button class="back-btn" @click.stop="handleCardClick">
          ← 返回
        </button>
        <button
          class="favorite-btn"
          :class="{ active: isFavorite }"
          @click.stop="toggleFavorite"
        >
          <span class="star-icon">{{ isFavorite ? '★' : '☆' }}</span>
          {{ isFavorite ? '已收藏' : '收藏' }}
        </button>

        <div class="back-scroll">
          <div class="illustration-box">
            <svg v-if="poem.illustrationType === 'mountain'" class="ink-art" viewBox="0 0 200 120">
              <path d="M0,100 Q30,60 50,80 T100,70 T150,60 T200,85 L200,120 L0,120 Z" fill="#C4A77D" opacity="0.5"/>
              <path d="M20,90 Q50,40 70,70 T130,50 T180,75" stroke="#8B5E3C" stroke-width="2" fill="none"/>
              <path d="M60,70 Q70,30 85,65" stroke="#8B5E3C" stroke-width="1.5" fill="none"/>
              <circle cx="160" cy="30" r="12" fill="#D4A574" opacity="0.6"/>
            </svg>
            <svg v-else-if="poem.illustrationType === 'flower'" class="ink-art" viewBox="0 0 200 120">
              <path d="M100,110 L100,60" stroke="#5B7553" stroke-width="2"/>
              <ellipse cx="85" cy="85" rx="8" ry="4" fill="#5B7553" opacity="0.7" transform="rotate(-30 85 85)"/>
              <ellipse cx="115" cy="75" rx="8" ry="4" fill="#5B7553" opacity="0.7" transform="rotate(30 115 75)"/>
              <circle cx="100" cy="50" r="18" fill="#E8A0BF" opacity="0.6"/>
              <circle cx="100" cy="50" r="10" fill="#D4A574"/>
              <ellipse cx="75" cy="45" rx="15" ry="10" fill="#FAD0C4" opacity="0.5" transform="rotate(-45 75 45)"/>
              <ellipse cx="125" cy="45" rx="15" ry="10" fill="#FAD0C4" opacity="0.5" transform="rotate(45 125 45)"/>
              <ellipse cx="80" cy="30" rx="14" ry="9" fill="#FAD0C4" opacity="0.5" transform="rotate(-20 80 30)"/>
              <ellipse cx="120" cy="30" rx="14" ry="9" fill="#FAD0C4" opacity="0.5" transform="rotate(20 120 30)"/>
            </svg>
            <svg v-else-if="poem.illustrationType === 'bird'" class="ink-art" viewBox="0 0 200 120">
              <path d="M0,100 Q50,95 100,98 T200,95" stroke="#5B7553" stroke-width="2" fill="none"/>
              <ellipse cx="40" cy="50" rx="18" ry="12" fill="#8B5E3C" opacity="0.8"/>
              <circle cx="55" cy="42" r="8" fill="#8B5E3C" opacity="0.8"/>
              <path d="M62,40 L75,42 L62,46 Z" fill="#D4A574"/>
              <circle cx="57" cy="40" r="1.5" fill="#FFF8F0"/>
              <path d="M30,50 Q10,35 25,55 Q35,50 30,50" fill="#A67C52"/>
              <ellipse cx="150" cy="35" rx="15" ry="10" fill="#8B5E3C" opacity="0.7"/>
              <circle cx="162" cy="28" r="7" fill="#8B5E3C" opacity="0.7"/>
              <path d="M168,27 L180,29 L168,32 Z" fill="#D4A574"/>
              <circle cx="164" cy="26" r="1.2" fill="#FFF8F0"/>
            </svg>
            <svg v-else-if="poem.illustrationType === 'moon'" class="ink-art" viewBox="0 0 200 120">
              <rect width="200" height="120" fill="#2C3E50" opacity="0.15" rx="4"/>
              <circle cx="150" cy="40" r="25" fill="#FFF8F0" opacity="0.9"/>
              <circle cx="142" cy="35" r="20" fill="#FFF8F0"/>
              <circle cx="30" cy="25" r="1" fill="#8B5E3C" opacity="0.6"/>
              <circle cx="60" cy="15" r="0.8" fill="#8B5E3C" opacity="0.5"/>
              <circle cx="90" cy="30" r="1.2" fill="#8B5E3C" opacity="0.7"/>
              <circle cx="110" cy="10" r="0.6" fill="#8B5E3C" opacity="0.4"/>
              <path d="M0,110 Q50,90 100,105 T200,95 L200,120 L0,120 Z" fill="#5B7553" opacity="0.3"/>
            </svg>
            <svg v-else-if="poem.illustrationType === 'river'" class="ink-art" viewBox="0 0 200 120">
              <path d="M0,70 Q30,60 60,68 T120,65 T200,72 L200,120 L0,120 Z" fill="#A8C8E4" opacity="0.5"/>
              <path d="M10,80 Q40,75 70,82 T130,78 T195,85" stroke="#6B8FAF" stroke-width="1" fill="none" opacity="0.6"/>
              <path d="M10,95 Q50,88 90,96 T170,92 T198,100" stroke="#6B8FAF" stroke-width="1" fill="none" opacity="0.5"/>
              <path d="M0,50 Q40,30 70,45 T140,35 T200,50" stroke="#8B5E3C" stroke-width="2" fill="none"/>
              <path d="M0,40 L200,40" stroke="#D4A574" stroke-width="0.5" opacity="0.4"/>
            </svg>
            <svg v-else class="ink-art" viewBox="0 0 200 120">
              <rect x="70" y="40" width="60" height="50" fill="#C4A77D" opacity="0.6"/>
              <polygon points="60,40 100,15 140,40" fill="#8B5E3C" opacity="0.7"/>
              <rect x="90" y="60" width="20" height="30" fill="#5B3A29" opacity="0.6"/>
              <rect x="75" y="50" width="12" height="12" fill="#FFF8F0" opacity="0.8"/>
              <rect x="113" y="50" width="12" height="12" fill="#FFF8F0" opacity="0.8"/>
              <path d="M0,95 Q50,85 100,92 T200,88" stroke="#5B7553" stroke-width="2" fill="none"/>
              <path d="M0,105 Q60,95 120,102 T200,98" stroke="#5B7553" stroke-width="1.5" fill="none" opacity="0.7"/>
            </svg>
          </div>

          <h3 class="back-title">{{ poem.title }}</h3>
          <p class="back-author">〔唐〕{{ poem.author }}</p>

          <div class="poem-body">
            <p class="poem-content">{{ poem.content }}</p>
          </div>

          <div class="section">
            <h4 class="section-title">【白话译文】</h4>
            <p class="section-text">{{ poem.translation }}</p>
          </div>

          <div class="section">
            <h4 class="section-title">【创作背景】</h4>
            <p class="section-text">{{ poem.background }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Poem } from '../utils/poemData'

const props = defineProps<{
  poem: Poem
  delay: number
  isFavorite: boolean
  index: number
}>()

const emit = defineEmits<{
  (e: 'toggleFavorite', id: number): void
  (e: 'view', id: number): void
}>()

const isFlipped = ref(false)

const shadowStyle = computed(() => {
  const offset = props.index % 4
  const offsets = [
    '4px 6px 16px',
    '6px 4px 18px',
    '5px 7px 20px',
    '3px 5px 14px'
  ]
  return `${offsets[offset]} var(--shadow-medium)`
})

function handleCardClick() {
  isFlipped.value = !isFlipped.value
  if (isFlipped.value) {
    emit('view', props.poem.id)
  }
}

function toggleFavorite() {
  emit('toggleFavorite', props.poem.id)
}
</script>

<style scoped>
.poem-card-wrapper {
  perspective: 1200px;
  height: 340px;
}

.poem-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border-radius: 12px;
}

.poem-card.is-flipped {
  transform: rotateY(180deg);
}

.poem-card:active {
  transform: scale(0.98);
}

.poem-card.is-flipped:active {
  transform: rotateY(180deg) scale(0.98);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 12px;
  overflow: hidden;
}

.card-front {
  background: linear-gradient(145deg, var(--card-gradient-start), var(--card-gradient-end));
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid rgba(139, 94, 60, 0.15);
}

.front-decoration {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid var(--text-primary);
  opacity: 0.25;
}

.front-decoration.top-left {
  top: 10px;
  left: 10px;
  border-right: none;
  border-bottom: none;
}

.front-decoration.top-right {
  top: 10px;
  right: 10px;
  border-left: none;
  border-bottom: none;
}

.front-decoration.bottom-left {
  bottom: 10px;
  left: 10px;
  border-right: none;
  border-top: none;
}

.front-decoration.bottom-right {
  bottom: 10px;
  right: 10px;
  border-left: none;
  border-top: none;
}

.card-content {
  text-align: center;
  z-index: 1;
}

.poem-title {
  font-size: 1.7rem;
  color: var(--text-primary);
  margin-bottom: 12px;
  font-weight: 700;
  letter-spacing: 4px;
}

.poem-author {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.poem-verse {
  font-size: 1.15rem;
  color: var(--text-primary);
  line-height: 2;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.flip-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.hint-icon {
  animation: bounceIn 2s ease-in-out infinite;
}

.favorite-star {
  position: absolute;
  top: 12px;
  left: 14px;
  font-size: 1.3rem;
  color: var(--gold-dark);
  z-index: 10;
  filter: drop-shadow(0 1px 2px rgba(184, 134, 11, 0.4));
  animation: pulse-gold 2.5s ease-in-out infinite;
}

.card-back {
  background: linear-gradient(180deg, #FFFBF5 0%, #FFF5E6 100%);
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(139, 94, 60, 0.15);
}

.back-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 14px;
  background: rgba(139, 94, 60, 0.1);
  border: 1px solid rgba(139, 94, 60, 0.2);
  border-radius: 20px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s ease;
  z-index: 10;
}

.back-btn:hover {
  background: rgba(139, 94, 60, 0.2);
  transform: translateX(-2px);
}

.favorite-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 14px;
  background: rgba(139, 94, 60, 0.1);
  border: 1px solid rgba(139, 94, 60, 0.2);
  border-radius: 20px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 10;
}

.favorite-btn:hover {
  background: rgba(212, 165, 116, 0.25);
  transform: scale(1.05);
}

.favorite-btn.active {
  background: rgba(212, 165, 116, 0.35);
  border-color: var(--gold);
  color: var(--gold-dark);
}

.star-icon {
  font-size: 1rem;
}

.favorite-btn.active .star-icon {
  animation: bounceIn 0.5s ease;
}

.back-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 52px 20px 20px;
}

.back-scroll::-webkit-scrollbar {
  width: 4px;
}

.back-scroll::-webkit-scrollbar-thumb {
  background: var(--gold);
  border-radius: 2px;
}

.illustration-box {
  width: 100%;
  height: 100px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(139, 94, 60, 0.1);
}

.ink-art {
  width: 90%;
  height: 90%;
}

.back-title {
  font-size: 1.4rem;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 4px;
  letter-spacing: 3px;
}

.back-author {
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.poem-body {
  background: rgba(250, 208, 196, 0.3);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
  border-left: 3px solid var(--gold);
}

.poem-content {
  font-size: 1.05rem;
  color: var(--text-primary);
  line-height: 2.2;
  text-align: center;
  letter-spacing: 1px;
}

.section {
  margin-bottom: 14px;
}

.section-title {
  font-size: 0.95rem;
  color: var(--gold-dark);
  margin-bottom: 6px;
  font-weight: 600;
}

.section-text {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.8;
  text-align: justify;
}

@media (max-width: 640px) {
  .poem-card-wrapper {
    height: 300px;
  }
  .poem-title {
    font-size: 1.4rem;
    letter-spacing: 2px;
  }
  .poem-verse {
    font-size: 1rem;
  }
  .illustration-box {
    height: 80px;
  }
}
</style>
