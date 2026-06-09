export interface Palette {
  id: string;
  name: string;
  colors: string[];
  createdAt: number;
}

export interface ExtractColorsResponse {
  colors: string[];
}

const API_BASE = '';

export async function uploadImage(file: File): Promise<string[]> {
  const formData = new FormData();
  formData.append('image', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '色值提取失败');
    }

    const data: ExtractColorsResponse = await response.json();
    return data.colors;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请重试');
    }
    throw error;
  }
}

export async function savePalette(name: string, colors: string[]): Promise<Palette> {
  const response = await fetch(`${API_BASE}/palettes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, colors })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '保存方案失败');
  }

  return response.json();
}

export async function getPalettes(): Promise<Palette[]> {
  const response = await fetch(`${API_BASE}/palettes`, {
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '获取方案列表失败');
  }

  return response.json();
}
