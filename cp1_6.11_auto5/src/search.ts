export function setupSearch(
  inputEl: HTMLInputElement,
  getCards: () => HTMLElement[],
  getCardText: (cardEl: HTMLElement) => { title: string; description: string }
): void {
  let searchTimeout: number | null = null

  inputEl.addEventListener('input', () => {
    if (searchTimeout !== null) {
      clearTimeout(searchTimeout)
    }
    searchTimeout = window.setTimeout(() => {
      const query = inputEl.value.trim().toLowerCase()
      filterCards(query, getCards(), getCardText)
    }, 150)
  })
}

function filterCards(
  query: string,
  cards: HTMLElement[],
  getCardText: (cardEl: HTMLElement) => { title: string; description: string }
): void {
  cards.forEach((card) => {
    const { title, description } = getCardText(card)
    const titleEl = card.querySelector('.card-title')
    const descEl = card.querySelector('.card-description')

    if (!query) {
      card.classList.remove('hidden')
      if (titleEl) titleEl.innerHTML = escapeHtml(title)
      if (descEl) descEl.innerHTML = escapeHtml(description)
      return
    }

    const titleMatch = title.toLowerCase().includes(query)
    const descMatch = description.toLowerCase().includes(query)

    if (titleMatch || descMatch) {
      card.classList.remove('hidden')
      if (titleEl && titleMatch) {
        titleEl.innerHTML = highlightText(title, query)
      } else if (titleEl) {
        titleEl.innerHTML = escapeHtml(title)
      }
      if (descEl && descMatch) {
        descEl.innerHTML = highlightText(description, query)
      } else if (descEl) {
        descEl.innerHTML = escapeHtml(description)
      }
    } else {
      card.classList.add('hidden')
    }
  })
}

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text)

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let result = ''
  let lastIndex = 0
  let index = lowerText.indexOf(lowerQuery)

  while (index !== -1) {
    result += escapeHtml(text.slice(lastIndex, index))
    result += `<span class="highlight">${escapeHtml(text.slice(index, index + query.length))}</span>`
    lastIndex = index + query.length
    index = lowerText.indexOf(lowerQuery, lastIndex)
  }

  result += escapeHtml(text.slice(lastIndex))
  return result
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
