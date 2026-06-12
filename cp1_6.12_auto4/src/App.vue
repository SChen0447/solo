<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import MusicCard from './components/MusicCard.vue'
import ContactForm from './components/ContactForm.vue'

interface Track {
  id: string
  title: string
  description: string
  cover: string
  audioFile: File | null
  audioUrl: string
  duration: number
}

const tracks = reactive<Track[]>([
  {
    id: '1',
    title: '星空漫步',
    description: '一首关于夜晚星空的轻音乐',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20music%20album%20cover%20purple%20blue%20galaxy&image_size=square',
    audioFile: null,
    audioUrl: '',
    duration: 180
  },
  {
    id: '2',
    title: '城市节拍',
    description: '充满活力的都市电子音乐',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=urban%20city%20night%20music%20album%20cover%20neon&image_size=square',
    audioFile: null,
    audioUrl: '',
    duration: 210
  },
  {
    id: '3',
    title: '海洋之心',
    description: '舒缓的海浪声与钢琴旋律',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20waves%20piano%20music%20album%20cover%20blue&image_size=square',
    audioFile: null,
    audioUrl: '',
    duration: 240
  }
])

const currentPlayingId = ref<string | null>(null)
const currentAudio = ref<HTMLAudioElement | null>(null)
const draggedIndex = ref<number | null>(null)
const editingTrackId = ref<string | null>(null)
const deleteConfirmId = ref<string | null>(null)
const showUploadForm = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const showToast = ref(false)

const newTrack = reactive({
  title: '',
  description: '',
  cover: '',
  audioFile: null as File | null
})

const playTrack = (trackId: string) => {
  const track = tracks.find(t => t.id === trackId)
  if (!track) return

  if (currentPlayingId.value === trackId) {
    currentAudio.value?.pause()
    currentPlayingId.value = null
    return
  }

  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
  }

  if (track.audioUrl) {
    currentAudio.value = new Audio(track.audioUrl)
    currentAudio.value.play()
    currentPlayingId.value = trackId
    currentAudio.value.onended = () => {
      currentPlayingId.value = null
    }
  } else {
    showToastMessage('请先上传音频文件', 'error')
  }
}

const stopAll = () => {
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
  }
  currentPlayingId.value = null
}

const handleFileUpload = (event: Event, field: 'cover' | 'audio') => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (field === 'audio') {
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      showToastMessage('请上传 MP3 格式的音频文件', 'error')
      return
    }
    newTrack.audioFile = file
  } else {
    const reader = new FileReader()
    reader.onload = (e) => {
      newTrack.cover = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const addTrack = () => {
  if (!newTrack.title.trim()) {
    showToastMessage('请输入歌曲标题', 'error')
    return
  }

  let audioUrl = ''
  if (newTrack.audioFile) {
    audioUrl = URL.createObjectURL(newTrack.audioFile)
  }

  const track: Track = {
    id: Date.now().toString(),
    title: newTrack.title,
    description: newTrack.description,
    cover: newTrack.cover || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20album%20cover%20abstract%20art&image_size=square',
    audioFile: newTrack.audioFile,
    audioUrl,
    duration: 180
  }

  tracks.push(track)
  resetNewTrack()
  showUploadForm.value = false
  showToastMessage('作品添加成功', 'success')
}

const resetNewTrack = () => {
  newTrack.title = ''
  newTrack.description = ''
  newTrack.cover = ''
  newTrack.audioFile = null
}

const startEdit = (track: Track) => {
  editingTrackId.value = track.id
}

const saveEdit = (track: Track, event: Event) => {
  const target = event.target as HTMLElement
  const form = target.closest('.edit-form') as HTMLElement
  const titleInput = form.querySelector('.edit-title') as HTMLInputElement
  const descInput = form.querySelector('.edit-desc') as HTMLTextAreaElement

  track.title = titleInput.value
  track.description = descInput.value
  editingTrackId.value = null
  showToastMessage('作品信息已更新', 'success')
}

const cancelEdit = () => {
  editingTrackId.value = null
}

const handleCoverUpload = (event: Event, track: Track) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    track.cover = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleAudioUpload = (event: Event, track: Track) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
    showToastMessage('请上传 MP3 格式的音频文件', 'error')
    return
  }

  if (track.audioUrl) {
    URL.revokeObjectURL(track.audioUrl)
  }

  track.audioFile = file
  track.audioUrl = URL.createObjectURL(file)
  showToastMessage('音频上传成功', 'success')
}

const confirmDelete = (trackId: string) => {
  deleteConfirmId.value = trackId
}

const cancelDelete = () => {
  deleteConfirmId.value = null
}

const deleteTrack = (trackId: string) => {
  const index = tracks.findIndex(t => t.id === trackId)
  if (index > -1) {
    const track = tracks[index]
    if (track.audioUrl) {
      URL.revokeObjectURL(track.audioUrl)
    }
    if (currentPlayingId.value === trackId) {
      stopAll()
    }
    tracks.splice(index, 1)
    deleteConfirmId.value = null
    showToastMessage('作品已删除', 'success')
  }
}

const onDragStart = (index: number) => {
  draggedIndex.value = index
}

const onDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === index) return

  const draggedItem = tracks[draggedIndex.value]
  tracks.splice(draggedIndex.value, 1)
  tracks.splice(index, 0, draggedItem)
  draggedIndex.value = index
}

const onDragEnd = () => {
  draggedIndex.value = null
}

const showToastMessage = (message: string, type: 'success' | 'error') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

onUnmounted(() => {
  stopAll()
  tracks.forEach(track => {
    if (track.audioUrl) {
      URL.revokeObjectURL(track.audioUrl)
    }
  })
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <h1 class="title">
          <span class="icon">🎵</span>
          我的音乐作品集
        </h1>
        <button class="add-btn" @click="showUploadForm = !showUploadForm">
          {{ showUploadForm ? '取消' : '+ 添加作品' }}
        </button>
      </div>
    </header>

    <div v-if="showUploadForm" class="upload-section">
      <div class="upload-card">
        <h3>添加新作品</h3>
        <div class="form-group">
          <label>歌曲标题 *</label>
          <input
            v-model="newTrack.title"
            type="text"
            placeholder="输入歌曲名称"
            class="input"
          />
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea
            v-model="newTrack.description"
            placeholder="描述你的音乐..."
            class="textarea"
            rows="3"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>封面图片</label>
            <label class="file-label">
              <input
                type="file"
                accept="image/*"
                @change="(e) => handleFileUpload(e, 'cover')"
                class="file-input"
              />
              <span class="file-btn">选择图片</span>
            </label>
            <div v-if="newTrack.cover" class="preview-cover">
              <img :src="newTrack.cover" alt="预览" />
            </div>
          </div>
          <div class="form-group">
            <label>音频文件 (MP3)</label>
            <label class="file-label">
              <input
                type="file"
                accept="audio/mpeg,audio/mp3"
                @change="(e) => handleFileUpload(e, 'audio')"
                class="file-input"
              />
              <span class="file-btn">选择音频</span>
            </label>
            <span v-if="newTrack.audioFile" class="file-name">
              {{ newTrack.audioFile.name }}
            </span>
          </div>
        </div>
        <button class="submit-btn" @click="addTrack">添加作品</button>
      </div>
    </div>

    <main class="main-content">
      <div class="tracks-grid">
        <div
          v-for="(track, index) in tracks"
          :key="track.id"
          class="track-wrapper"
          :class="{ dragging: draggedIndex === index }"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover="(e) => onDragOver(e, index)"
          @dragend="onDragEnd"
        >
          <div v-if="deleteConfirmId === track.id" class="delete-confirm">
            <p>确定要删除这个作品吗？</p>
            <div class="confirm-buttons">
              <button class="confirm-btn danger" @click="deleteTrack(track.id)">确定删除</button>
              <button class="confirm-btn" @click="cancelDelete">取消</button>
            </div>
          </div>

          <template v-else>
            <div v-if="editingTrackId === track.id" class="edit-form">
              <input
                :value="track.title"
                class="input edit-title"
                placeholder="歌曲标题"
              />
              <textarea
                :value="track.description"
                class="textarea edit-desc"
                placeholder="描述"
                rows="2"
              />
              <div class="edit-file-row">
                <label class="file-label small">
                  <input
                    type="file"
                    accept="image/*"
                    @change="(e) => handleCoverUpload(e, track)"
                    class="file-input"
                  />
                  <span>更换封面</span>
                </label>
                <label class="file-label small">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    @change="(e) => handleAudioUpload(e, track)"
                    class="file-input"
                  />
                  <span>更换音频</span>
                </label>
              </div>
              <div class="edit-buttons">
                <button class="confirm-btn" @click="(e) => saveEdit(track, e)">保存</button>
                <button class="confirm-btn secondary" @click="cancelEdit">取消</button>
              </div>
            </div>

            <MusicCard
              v-else
              :track="track"
              :is-playing="currentPlayingId === track.id"
              @play="playTrack(track.id)"
              @edit="startEdit(track)"
              @delete="confirmDelete(track.id)"
            />
          </template>
        </div>
      </div>
    </main>

    <footer class="footer">
      <ContactForm @toast="showToastMessage" />
      <div class="copyright">
        <p>© 2024 我的音乐作品集 | 用音乐传递情感</p>
      </div>
    </footer>

    <Transition name="toast">
      <div v-if="showToast" class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--bg-card);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  font-size: 1.8rem;
  -webkit-text-fill-color: initial;
}

.add-btn {
  background: var(--accent-gradient);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  transition: transform var(--transition-duration) var(--transition-ease),
    box-shadow var(--transition-duration) var(--transition-ease);
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
}

.upload-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

.upload-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.upload-card h3 {
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input,
.textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: border-color var(--transition-duration) var(--transition-ease);
  border-radius: 4px 4px 0 0;
}

.input:focus,
.textarea:focus {
  border-image: var(--accent-gradient) 1;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.file-label {
  display: inline-block;
  cursor: pointer;
}

.file-input {
  display: none;
}

.file-btn {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  transition: background var(--transition-duration) var(--transition-ease);
}

.file-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.file-label.small span {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  transition: background var(--transition-duration) var(--transition-ease);
}

.file-label.small:hover span {
  background: rgba(255, 255, 255, 0.2);
}

.file-name {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.preview-cover {
  margin-top: 0.75rem;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.submit-btn {
  width: 100%;
  background: var(--accent-gradient);
  color: white;
  padding: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  margin-top: 1rem;
  transition: transform var(--transition-duration) var(--transition-ease),
    box-shadow var(--transition-duration) var(--transition-ease);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
}

.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

.tracks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .tracks-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .tracks-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1400px) {
  .tracks-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.track-wrapper {
  position: relative;
  transition: opacity var(--transition-duration) var(--transition-ease);
}

.track-wrapper.dragging {
  opacity: 0.5;
}

.delete-confirm {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  border: 1px solid rgba(233, 69, 96, 0.3);
}

.delete-confirm p {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.confirm-buttons,
.edit-buttons,
.edit-file-row {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.confirm-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  background: var(--accent-gradient);
  color: white;
  transition: transform var(--transition-duration) var(--transition-ease);
}

.confirm-btn:hover {
  transform: translateY(-2px);
}

.confirm-btn.danger {
  background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
}

.confirm-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
}

.edit-form {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.edit-form .input,
.edit-form .textarea {
  margin-bottom: 1rem;
}

.footer {
  background: var(--bg-card);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.copyright {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.toast.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.toast.error {
  background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-duration) var(--transition-ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 768px) {
  .header-content {
    padding: 1rem;
  }

  .title {
    font-size: 1.2rem;
  }

  .main-content,
  .upload-section {
    padding: 1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
