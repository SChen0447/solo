<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { ContractFormData } from '@/contracts'
import { mockService } from '@/services/mockService'

const router = useRouter()
const route = useRoute()

const showCreateForm = ref(false)
const mobileMenuOpen = ref(false)

const formData = ref<ContractFormData>({
  title: '',
  partyAName: '',
  partyAEmail: '',
  partyBName: '',
  partyBEmail: '',
  content: ''
})

const isListActive = computed(() => {
  return route.path === '/' || route.path === '/contracts'
})

const openCreateForm = () => {
  showCreateForm.value = true
  mobileMenuOpen.value = false
  formData.value = {
    title: '',
    partyAName: '',
    partyAEmail: '',
    partyBName: '',
    partyBEmail: '',
    content: ''
  }
}

const closeForm = () => {
  showCreateForm.value = false
}

const saveDraft = async () => {
  if (!formData.value.title.trim()) {
    alert('请填写合同标题')
    return
  }
  const contract = await mockService.createContract(formData.value)
  showCreateForm.value = false
  router.push(`/contracts/${contract.id}`)
}

const goToList = () => {
  showCreateForm.value = false
  mobileMenuOpen.value = false
  router.push('/contracts')
}
</script>

<template>
  <div class="app-container">
    <header class="navbar">
      <div class="navbar-content">
        <div class="logo">
          <span class="logo-icon">📋</span>
          <span class="logo-text">合同管家</span>
        </div>

        <nav class="nav-desktop">
          <button
            class="nav-btn"
            :class="{ active: isListActive && !showCreateForm }"
            @click="goToList"
          >
            我的合同
          </button>
          <button
            class="create-btn"
            @click="openCreateForm"
          >
            + 创建新合同
          </button>
        </nav>

        <button class="hamburger-btn" @click="mobileMenuOpen = !mobileMenuOpen">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav v-if="mobileMenuOpen" class="nav-mobile">
        <button
          class="nav-btn mobile"
          :class="{ active: isListActive && !showCreateForm }"
          @click="goToList"
        >
          我的合同
        </button>
        <button
          class="create-btn mobile"
          @click="openCreateForm"
        >
          + 创建新合同
        </button>
      </nav>
    </header>

    <div v-if="showCreateForm" class="form-overlay" @click.self="closeForm">
      <div class="form-modal">
        <h2 class="form-title">创建新合同</h2>

        <div class="form-group">
          <label>合同标题</label>
          <input
            v-model="formData.title"
            type="text"
            placeholder="请输入合同标题"
            class="form-input"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>甲方姓名</label>
            <input
              v-model="formData.partyAName"
              type="text"
              placeholder="请输入甲方姓名"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>甲方邮箱</label>
            <input
              v-model="formData.partyAEmail"
              type="email"
              placeholder="请输入甲方邮箱"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>乙方姓名</label>
            <input
              v-model="formData.partyBName"
              type="text"
              placeholder="请输入乙方姓名"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>乙方邮箱</label>
            <input
              v-model="formData.partyBEmail"
              type="email"
              placeholder="请输入乙方邮箱"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label>合同条款</label>
          <textarea
            v-model="formData.content"
            class="rich-editor"
            placeholder="请输入合同条款内容，支持HTML格式..."
            rows="12"
          ></textarea>
        </div>

        <div class="form-actions">
          <button class="btn-save" @click="saveDraft">保存草稿</button>
          <button class="btn-cancel" @click="closeForm">关闭</button>
        </div>
      </div>
    </div>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: #1a1a2e;
}

.navbar {
  background-color: #16213e;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.navbar-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-btn {
  background: transparent;
  color: #e0e0e0;
  font-size: 15px;
  padding: 8px 4px;
  position: relative;
  transition: color 0.3s ease;
}

.nav-btn:hover {
  color: #4fc3f7;
}

.nav-btn.active {
  color: #4fc3f7;
}

.nav-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background-color: #4fc3f7;
}

.create-btn {
  background-color: #1976d2;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
}

.create-btn:hover {
  background-color: #1565c0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
}

.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: transparent;
  padding: 8px;
}

.hamburger-btn span {
  display: block;
  width: 24px;
  height: 2px;
  background-color: #e0e0e0;
  transition: all 0.3s ease;
}

.nav-mobile {
  display: none;
  flex-direction: column;
  padding: 12px 0 20px;
  gap: 8px;
}

.nav-btn.mobile {
  text-align: left;
  padding: 12px 16px;
  width: 100%;
}

.nav-btn.mobile.active::after {
  display: none;
}

.nav-btn.mobile.active {
  background-color: rgba(79, 195, 247, 0.1);
  border-radius: 6px;
}

.create-btn.mobile {
  margin: 0 16px;
}

.form-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.form-modal {
  background-color: #16213e;
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.form-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 28px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  color: #e0e0e0;
  font-size: 14px;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  background-color: #1a1a2e;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-input:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.15);
}

.form-input::placeholder {
  color: #666;
}

.rich-editor {
  width: 500px;
  max-width: 100%;
  padding: 16px;
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #333;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  min-height: 200px;
  transition: border-color 0.3s ease;
}

.rich-editor:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.15);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.btn-save {
  background-color: #4caf50;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 28px;
  border-radius: 6px;
}

.btn-save:hover {
  background-color: #43a047;
}

.btn-cancel {
  background-color: #f44336;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 28px;
  border-radius: 6px;
}

.btn-cancel:hover {
  background-color: #e53935;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

@media (max-width: 768px) {
  .nav-desktop {
    display: none;
  }

  .hamburger-btn {
    display: flex;
  }

  .nav-mobile {
    display: flex;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-modal {
    padding: 20px;
  }

  .main-content {
    padding: 20px 16px;
  }
}
</style>
