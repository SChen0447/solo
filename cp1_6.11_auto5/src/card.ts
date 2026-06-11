export type Priority = 'high' | 'medium' | 'low'

export interface CardData {
  id: string
  title: string
  description: string
  priority: Priority
  columnId: string
}

export interface CardCallbacks {
  onEdit: (id: string, data: Partial<Omit<CardData, 'id' | 'columnId'>>) => void
  onDragStart: (e: DragEvent, cardId: string) => void
  onDragEnd: (e: DragEvent) => void
}

const priorityLabels: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

export function createCardElement(card: CardData, callbacks: CardCallbacks): HTMLElement {
  const cardEl = document.createElement('div')
  cardEl.className = 'card'
  cardEl.draggable = true
  cardEl.dataset.cardId = card.id

  const headerEl = document.createElement('div')
  headerEl.className = 'card-header'

  const titleEl = document.createElement('div')
  titleEl.className = 'card-title'
  titleEl.textContent = card.title

  const priorityTag = document.createElement('div')
  priorityTag.className = 'priority-tag'

  const priorityDot = document.createElement('span')
  priorityDot.className = `priority-dot ${card.priority}`

  const priorityLabel = document.createElement('span')
  priorityLabel.className = 'priority-label'
  priorityLabel.textContent = priorityLabels[card.priority]

  priorityTag.appendChild(priorityDot)
  priorityTag.appendChild(priorityLabel)

  headerEl.appendChild(titleEl)
  headerEl.appendChild(priorityTag)

  const descEl = document.createElement('div')
  descEl.className = 'card-description'
  descEl.textContent = card.description

  const actionsEl = document.createElement('div')
  actionsEl.className = 'card-actions'

  const editBtn = document.createElement('button')
  editBtn.className = 'edit-btn'
  editBtn.textContent = '编辑'
  editBtn.type = 'button'

  actionsEl.appendChild(editBtn)

  cardEl.appendChild(headerEl)
  cardEl.appendChild(descEl)
  cardEl.appendChild(actionsEl)

  cardEl.addEventListener('dragstart', (e) => {
    callbacks.onDragStart(e, card.id)
  })

  cardEl.addEventListener('dragend', (e) => {
    callbacks.onDragEnd(e)
  })

  editBtn.addEventListener('click', () => {
    enterEditMode(cardEl, card, callbacks)
  })

  return cardEl
}

function enterEditMode(
  cardEl: HTMLElement,
  card: CardData,
  callbacks: CardCallbacks
): void {
  cardEl.innerHTML = ''
  cardEl.draggable = false

  const form = document.createElement('form')
  form.className = 'edit-form'

  const titleInput = document.createElement('input')
  titleInput.type = 'text'
  titleInput.className = 'edit-input'
  titleInput.value = card.title
  titleInput.placeholder = '卡片标题'
  titleInput.required = true

  const descTextarea = document.createElement('textarea')
  descTextarea.className = 'edit-textarea'
  descTextarea.value = card.description
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
    if (opt.value === card.priority) {
      optionEl.selected = true
    }
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
  saveBtn.textContent = '保存'

  formActions.appendChild(cancelBtn)
  formActions.appendChild(saveBtn)

  form.appendChild(titleInput)
  form.appendChild(descTextarea)
  form.appendChild(prioritySelect)
  form.appendChild(formActions)

  cardEl.appendChild(form)

  setTimeout(() => {
    titleInput.focus()
    titleInput.select()
  }, 10)

  cancelBtn.addEventListener('click', () => {
    exitEditMode(cardEl, card, callbacks)
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const newTitle = titleInput.value.trim()
    if (!newTitle) return

    const newData = {
      title: newTitle,
      description: descTextarea.value.trim(),
      priority: prioritySelect.value as Priority
    }

    callbacks.onEdit(card.id, newData)
  })
}

function exitEditMode(
  cardEl: HTMLElement,
  card: CardData,
  callbacks: CardCallbacks
): void {
  cardEl.innerHTML = ''
  cardEl.draggable = true

  const headerEl = document.createElement('div')
  headerEl.className = 'card-header'

  const titleEl = document.createElement('div')
  titleEl.className = 'card-title'
  titleEl.textContent = card.title

  const priorityTag = document.createElement('div')
  priorityTag.className = 'priority-tag'

  const priorityDot = document.createElement('span')
  priorityDot.className = `priority-dot ${card.priority}`

  const priorityLabel = document.createElement('span')
  priorityLabel.className = 'priority-label'
  priorityLabel.textContent = priorityLabels[card.priority]

  priorityTag.appendChild(priorityDot)
  priorityTag.appendChild(priorityLabel)

  headerEl.appendChild(titleEl)
  headerEl.appendChild(priorityTag)

  const descEl = document.createElement('div')
  descEl.className = 'card-description'
  descEl.textContent = card.description

  const actionsEl = document.createElement('div')
  actionsEl.className = 'card-actions'

  const editBtn = document.createElement('button')
  editBtn.className = 'edit-btn'
  editBtn.textContent = '编辑'
  editBtn.type = 'button'

  actionsEl.appendChild(editBtn)

  cardEl.appendChild(headerEl)
  cardEl.appendChild(descEl)
  cardEl.appendChild(actionsEl)

  cardEl.addEventListener('dragstart', (e) => {
    callbacks.onDragStart(e, card.id)
  })

  cardEl.addEventListener('dragend', (e) => {
    callbacks.onDragEnd(e)
  })

  editBtn.addEventListener('click', () => {
    enterEditMode(cardEl, card, callbacks)
  })
}

export function updateCardElement(cardEl: HTMLElement, card: CardData, callbacks: CardCallbacks): void {
  cardEl.innerHTML = ''
  cardEl.draggable = true

  const headerEl = document.createElement('div')
  headerEl.className = 'card-header'

  const titleEl = document.createElement('div')
  titleEl.className = 'card-title'
  titleEl.textContent = card.title

  const priorityTag = document.createElement('div')
  priorityTag.className = 'priority-tag'

  const priorityDot = document.createElement('span')
  priorityDot.className = `priority-dot ${card.priority}`

  const priorityLabel = document.createElement('span')
  priorityLabel.className = 'priority-label'
  priorityLabel.textContent = priorityLabels[card.priority]

  priorityTag.appendChild(priorityDot)
  priorityTag.appendChild(priorityLabel)

  headerEl.appendChild(titleEl)
  headerEl.appendChild(priorityTag)

  const descEl = document.createElement('div')
  descEl.className = 'card-description'
  descEl.textContent = card.description

  const actionsEl = document.createElement('div')
  actionsEl.className = 'card-actions'

  const editBtn = document.createElement('button')
  editBtn.className = 'edit-btn'
  editBtn.textContent = '编辑'
  editBtn.type = 'button'

  actionsEl.appendChild(editBtn)

  cardEl.appendChild(headerEl)
  cardEl.appendChild(descEl)
  cardEl.appendChild(actionsEl)

  cardEl.addEventListener('dragstart', (e) => {
    callbacks.onDragStart(e, card.id)
  })

  cardEl.addEventListener('dragend', (e) => {
    callbacks.onDragEnd(e)
  })

  editBtn.addEventListener('click', () => {
    enterEditMode(cardEl, card, callbacks)
  })
}
