import type { Recipe, RecipeWithMatch, Note } from './types'

const API_BASE = '/api'

export const getRecommendations = async (ingredients: string[]): Promise<RecipeWithMatch[]> => {
  const response = await fetch(`${API_BASE}/recipes/recommend?ingredients=${encodeURIComponent(ingredients.join(','))}`)
  if (!response.ok) {
    throw new Error('获取推荐失败')
  }
  return response.json()
}

export const getRandomRecipe = async (): Promise<Recipe> => {
  const response = await fetch(`${API_BASE}/recipes/random`)
  if (!response.ok) {
    throw new Error('获取随机菜谱失败')
  }
  return response.json()
}

export const getRecipeById = async (id: string): Promise<Recipe> => {
  const response = await fetch(`${API_BASE}/recipes/${id}`)
  if (!response.ok) {
    throw new Error('获取菜谱详情失败')
  }
  return response.json()
}

export const getAllRecipes = async (): Promise<Recipe[]> => {
  const response = await fetch(`${API_BASE}/recipes`)
  if (!response.ok) {
    throw new Error('获取菜谱列表失败')
  }
  return response.json()
}

export const getFavorites = async (): Promise<Recipe[]> => {
  const response = await fetch(`${API_BASE}/favorites`)
  if (!response.ok) {
    throw new Error('获取收藏列表失败')
  }
  return response.json()
}

export const addFavorite = async (recipeId: string): Promise<Recipe[]> => {
  const response = await fetch(`${API_BASE}/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recipeId })
  })
  if (!response.ok) {
    throw new Error('添加收藏失败')
  }
  return response.json()
}

export const removeFavorite = async (recipeId: string): Promise<Recipe[]> => {
  const response = await fetch(`${API_BASE}/favorites/${recipeId}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error('取消收藏失败')
  }
  return response.json()
}

export const getNotes = async (recipeId: string): Promise<Note[]> => {
  const response = await fetch(`${API_BASE}/notes/${recipeId}`)
  if (!response.ok) {
    throw new Error('获取笔记失败')
  }
  return response.json()
}

export const addNote = async (recipeId: string, content: string): Promise<Note> => {
  const response = await fetch(`${API_BASE}/notes/${recipeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })
  if (!response.ok) {
    throw new Error('添加笔记失败')
  }
  return response.json()
}

export const updateNote = async (recipeId: string, noteId: string, content: string): Promise<Note> => {
  const response = await fetch(`${API_BASE}/notes/${recipeId}/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })
  if (!response.ok) {
    throw new Error('更新笔记失败')
  }
  return response.json()
}

export const deleteNote = async (recipeId: string, noteId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/notes/${recipeId}/${noteId}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error('删除笔记失败')
  }
}
