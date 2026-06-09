import { ref } from 'vue'

export function useClipboard() {
  const toastVisible = ref(false)
  const toastMessage = ref('')

  function showToast(message: string, duration: number = 2000) {
    toastMessage.value = message
    toastVisible.value = true
    setTimeout(() => {
      toastVisible.value = false
    }, duration)
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = new Blob([text], { type: 'text/html' })
        const clipboardItem = new ClipboardItem({ 'text/html': blob })
        await navigator.clipboard.write([clipboardItem])
      }
      await navigator.clipboard.writeText(text)
      showToast('✓ HTML 已复制到剪贴板')
      return true
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        showToast('✓ HTML 已复制到剪贴板')
        document.body.removeChild(textarea)
        return true
      } catch {
        showToast('✗ 复制失败，请手动复制')
        document.body.removeChild(textarea)
        return false
      }
    }
  }

  return {
    toastVisible,
    toastMessage,
    copyToClipboard,
    showToast
  }
}
