import type { Marker, Comment, CreateMarkerRequest, CreateCommentRequest } from './types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const MarkerService = {
  getMarkers(): Promise<Marker[]> {
    return request<Marker[]>('/markers')
  },

  getMarker(id: string): Promise<Marker> {
    return request<Marker>(`/markers/${id}`)
  },

  createMarker(data: CreateMarkerRequest): Promise<Marker> {
    return request<Marker>('/markers', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  likeMarker(id: string): Promise<{ likes: number }> {
    return request<{ likes: number }>(`/markers/${id}/like`, {
      method: 'POST'
    })
  },

  addComment(id: string, data: CreateCommentRequest): Promise<Comment> {
    return request<Comment>(`/markers/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}
