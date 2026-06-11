import { CardData, Priority, createCardElement, updateCardElement } from './card'
import { setupSearch } from './search'

interface ColumnConfig {
  id: string
  title: string
}

const COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: '待办' },
  { id: 'in-progress', title: '进行中' },
  { id: 'done', title: '已完成' }
]

const STORAGE_KEY = 'kanban-cards'

let cards: CardData[] = []
let draggedCardId: string | null = null
let pendingClearColumnId: string | null = null

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function loadCards(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      cards = JSON.parse(stored)
    } else {
      cards = [
        {
          id: generateId(),
          title: '设计首页UI',
          description: '完成产品首页的视觉设计稿，包括导航栏、hero区域和功能模块',
          priority: 'high',
          columnId: 'todo'
        },
        {
          id: generateId(),
          title: '编写技术文档',
          description: '整理项目架构文档和API接口说明',
          priority: 'medium',
          columnId: 'todo'
        },
        {
          id: generateId(),
          title: '用户登录功能',
          description: '实现用户登录、注册和密码重置功能',
          priority: 'high',
          columnId: 'in-progress'
        },
        {
          id: generateId(),
          title: '代码审查',
          description: '审查上周提交的功能代码，确保质量达标',
          priority: 'low',
          columnId: 'in-progress'
        },
        {
          id: generateId(),
          title: '项目初始化',
          description: '搭建项目基础框架，配置开发环境',
          priority: 'medium',
          columnId: 'done'
        }
      ]
      saveCards()
    }
  } catch (e) {
    console.error('加载卡片数据失败:', e)
    cards = []
  }
}

function saveCards(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch (e) {
    console.error('保存卡片数据失败:', e)
  }
}

function getCardById(id: string): CardData | undefined {
  return cards.find((c) => c.id === id)
}

function getCardsByColumn(columnId: string): CardData[] {
  return cards.filter((c) => c.columnId === columnId)
}

function addCard(columnId: string, title: string, description: string, priority: Priority): CardData {
  const newCard: CardData = {
    id: generateId(),
    title,
    description,
    priority,
    columnId
  }
  cards.push(newCard)
  saveCards()
  return newCard
}

function updateCard(id: string, data: Partial<Omit<CardData, 'id'>>): void {
  const card = getCardById(id)
  if (card) {
    Object.assign(card, data)
    saveCards()
  }
}

function clearColumn(columnId: string): void {
  cards = cards.filter((c) => c.columnId !== columnId)
  saveCards()
}

function renderBoard(): void {
  const boardContainer = document.getElementById('boardContainer')
  if (!boardContainer) return

  boardContainer.innerHTML = ''

  COLUMNS.forEach((col) => {
    const columnEl = createColumnElement(col)
    boardContainer.appendChild(columnEl)
  })
}

function createColumnElement(col: ColumnConfig): HTMLElement {
  const columnEl = document.createElement('div')
  columnEl.className = 'column'
  columnEl.dataset.columnId = col.id

  const headerEl = document.createElement('div')
  headerEl.className = 'column-header'

  const clearBtn = document.createElement('button')
  clearBtn.className = 'clear-column-btn'
  clearBtn.textContent = '清空'
  clearBtn.type = 'button'
  clearBtn.addEventListener('click', () => {
    showClearConfirm(col.id, col.title)
  })

  const titleWrapper = document.createElement('div')
  titleWrapper.className = 'column-title-wrapper'

  const titleEl = document.createElement('h2')
  titleEl.className = 'column-title'
  titleEl.textContent = col.title

  const countEl = document.createElement('span')
  countEl.className = 'column-count'
  countEl.textContent = String(getCardsByColumn(col.id).length)

  titleWrapper.appendChild(titleEl)
  titleWrapper.appendChild(countEl)

  headerEl.appendChild(clearBtn)
  headerEl.appendChild(titleWrapper)

  const cardsContainer = document.createElement('div')
  cardsContainer.className = 'cards-container'
  cardsContainer.dataset.columnId = col.id

  const columnCards = getCardsByColumn(col.id)
  columnCards.forEach((card) => {
    const cardEl = createCardElement(card, cardCallbacks)
    cardsContainer.appendChild(cardEl)
  })

  const addBtn = document.createElement('button')
  addBtn.className = 'add-card-btn'
  addBtn.textContent = '+ 添加卡片'
  addBtn.type = 'button'
  addBtn.addEventListener('click', () => {
    showAddCardForm(col.id, cardsContainer, addBtn)
  })

  columnEl.appendChild(headerEl)
  columnEl.appendChild(cardsContainer)
  columnEl.appendChild(addBtn)

  columnEl.addEventListener('dragover', handleDragOver)
  columnEl.addEventListener('dragleave', handleDragLeave)
  columnEl.addEventListener('drop', handleDrop)

  return columnEl
}

const cardCallbacks = {
  onEdit: (id: string, data: Partial<Omit<CardData, 'id' | 'columnId'>>) => {
    updateCard(id, data)
    const card = getCardById(id)
    if (card) {
      const cardEl = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement
      if (cardEl) {
        updateCardElement(cardEl, card, cardCallbacks)
      }
    }
  },
  onDragStart: (e: DragEvent, cardId: string) => {
    draggedCardId = cardId
    const target = e.currentTarget as HTMLElement
    target.classList.add('dragging')
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', cardId)
    }
  },
  onDragEnd: (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.classList.remove('dragging')
    draggedCardId = null

    document.querySelectorAll('.column.drag-over').forEach((col) => {
      col.classList.remove('drag-over')
    })
  }
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  const columnEl = e.currentTarget as HTMLElement
  columnEl.classList.add('drag-over')
}

function handleDragLeave(e: DragEvent): void {
  const columnEl = e.currentTarget as HTMLElement
  const relatedTarget = e.relatedTarget as Node
  if (!columnEl.contains(relatedTarget)) {
    columnEl.classList.remove('drag-over')
  }
}

function handleDrop(e: DragEvent): void {
  e.preventDefault()
  const columnEl = e.currentTarget as HTMLElement
  columnEl.classList.remove('drag-over')

  const cardId = draggedCardId || (e.dataTransfer?.getData('text/plain') ?? '')
  const targetColumnId = columnEl.dataset.columnId

  if (!cardId || !targetColumnId) return

  const card = getCardById(cardId)
  if (!card || card.columnId === targetColumnId) return

  const oldColumnId = card.columnId
  updateCard(cardId, { columnId: targetColumnId })

  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement
  const targetContainer = columnEl.querySelector('.cards-container') as HTMLElement

  if (cardEl && targetContainer) {
    targetContainer.appendChild(cardEl)
  }

  updateColumnCount(oldColumnId)
  updateColumnCount(targetColumnId)
}

function updateColumnCount(columnId: string): void {
  const columnEl = document.querySelector(`[data-column-id="${columnId}"]`)
  if (!columnEl) return

  const countEl = columnEl.querySelector('.column-count') as HTMLElement | null
  if (!countEl) return

  const count = getCardsByColumn(columnId).length
  countEl.textContent = String(count)

  countEl.classList.remove('bounce')
  void countEl.offsetWidth
  countEl.classList.add('bounce')
}

function showAddCardForm(columnId: string, container: HTMLElement, addBtn: HTMLButtonElement): void {
  addBtn.style.display = 'none'

  const form = document.createElement('form')
  form.className = 'card edit-form'
  form.style.marginBottom = '0'

  const titleInput = document.createElement('input')
  titleInput.type = 'text'
  titleInput.className = 'edit-input'
  titleInput.placeholder = '卡片标题'
  titleInput.required = true

  const descTextarea = document.createElement('textarea')
  descTextarea.className = 'edit-textarea'
  descTextarea.placeholder = '卡片描述'

  const prioritySelect = document.createElement('select')
  prioritySelect.className = 'edit-select'

  const options: { value: Priority; label: string }[] = [
    { value: 'high', label: '高优先级' },
    { value: 'medium', label: '中优先级' },
    { value: 'low', label: '低优先级' }
  ]

  options.forEach((opt) => {
    const optionEl = document.createElement('option')
    optionEl.value = opt.value
    optionEl.textContent = opt.label
    prioritySelect.appendChild(optionEl)
  })

  const formActions = document.createElement('div')
  formActions.className = 'form-actions'

  const cancelBtn = document.createElement('button')
  cancelBtn.type = 'button'
  cancelBtn.className = 'cancel-btn'
  cancelBtn.textContent = '取消'

  const saveBtn = document.createElement('button')
  saveBtn.type = 'submit'
  saveBtn.className = 'save-btn'
  saveBtn.textContent = '添加'

  formActions.appendChild(cancelBtn)
  formActions.appendChild(saveBtn)

  form.appendChild(titleInput)
  form.appendChild(descTextarea)
  form.appendChild(prioritySelect)
  form.appendChild(formActions)

  container.appendChild(form)

  setTimeout(() => {
    titleInput.focus()
  }, 10)

  const cleanup = () => {
    form.remove()
    addBtn.style.display = ''
  }

  cancelBtn.addEventListener('click', cleanup)

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const title = titleInput.value.trim()
    if (!title) return

    const newCard = addCard(
      columnId,
      title,
      descTextarea.value.trim(),
      prioritySelect.value as Priority
    )

    const cardEl = createCardElement(newCard, cardCallbacks)
    form.replaceWith(cardEl)
    addBtn.style.display = ''

    updateColumnCount(columnId)
  })
}

function showClearConfirm(columnId: string, columnTitle: string): void {
  pendingClearColumnId = columnId

  const modal = document.getElementById('confirmModal')
  const messageEl = document.getElementById('modalMessage')

  if (messageEl) {
    messageEl.textContent = `确定要清空「${columnTitle}」列的所有卡片吗？此操作不可撤销。`
  }

  if (modal) {
    modal.classList.add('visible')
  }
}

function hideConfirmModal(): void {
  pendingClearColumnId = null
  const modal = document.getElementById('confirmModal')
  if (modal) {
    modal.classList.remove('visible')
  }
}

function setupModal(): void {
  const modal = document.getElementById('confirmModal')
  const cancelBtn = document.getElementById('modalCancel')
  const confirmBtn = document.getElementById('modalConfirm')

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideConfirmModal)
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (pendingClearColumnId) {
        const columnId = pendingClearColumnId
        clearColumn(columnId)
        renderColumnCards(columnId)
        updateColumnCount(columnId)
      }
      hideConfirmModal()
    })
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideConfirmModal()
      }
    })
  }
}

function renderColumnCards(columnId: string): void {
  const columnEl = document.querySelector(`[data-column-id="${columnId}"]`)
  if (!columnEl) return

  const cardsContainer = columnEl.querySelector('.cards-container')
  if (!cardsContainer) return

  cardsContainer.innerHTML = ''

  const columnCards = getCardsByColumn(columnId)
  columnCards.forEach((card) => {
    const cardEl = createCardElement(card, cardCallbacks)
    cardsContainer.appendChild(cardEl)
  })
}

function getAllCardElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.card')) as HTMLElement[]
}

function getCardText(cardEl: HTMLElement): { title: string; description: string } {
  const cardId = cardEl.dataset.cardId
  if (cardId) {
    const card = getCardById(cardId)
    if (card) {
      return { title: card.title, description: card.description }
    }
  }
  const titleEl = cardEl.querySelector('.card-title')
  const descEl = cardEl.querySelector('.card-description')
  return {
    title: titleEl?.textContent ?? '',
    description: descEl?.textContent ?? ''
  }
}

function init(): void {
  loadCards()
  renderBoard()
  setupModal()

  const searchInput = document.getElementById('searchInput') as HTMLInputElement
  if (searchInput) {
    setupSearch(searchInput, getAllCardElements, getCardText)
  }
}

document.addEventListener('DOMContentLoaded', init)
