import { create } from "zustand";
import type { LayerConfig, LightConfig } from "@/data/templates";
import { createBlankProject, TEMPLATES } from "@/data/templates";

export interface ProjectConfig {
  id: string;
  name: string;
  layers: LayerConfig[];
  light: LightConfig;
  updatedAt: string;
}

interface LightboxState {
  layers: LayerConfig[];
  light: LightConfig;
  rotationX: number;
  rotationY: number;
  activeLayerIndex: number;
  brushSize: number;
  isDrawing: boolean;
  history: ProjectConfig[];
  projectName: string;
  selectedTemplateId: string | null;

  setLayers: (layers: LayerConfig[]) => void;
  updateLayer: (index: number, updates: Partial<LayerConfig>) => void;
  setLight: (light: Partial<LightConfig>) => void;
  setRotation: (rx: number, ry: number) => void;
  setActiveLayerIndex: (index: number) => void;
  setBrushSize: (size: number) => void;
  setIsDrawing: (drawing: boolean) => void;
  loadTemplate: (templateId: string) => void;
  loadBlank: () => void;
  saveToHistory: () => void;
  loadFromHistory: (id: string) => void;
  deleteFromHistory: (id: string) => void;
  setProjectName: (name: string) => void;
}

const STORAGE_KEY = "lightbox_history";

function loadHistory(): ProjectConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveHistory(history: ProjectConfig[]) {
  try {
    const trimmed = history.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

const blank = createBlankProject();

export const useStore = create<LightboxState>((set, get) => ({
  layers: blank.layers,
  light: blank.light,
  rotationX: 0,
  rotationY: 0,
  activeLayerIndex: 0,
  brushSize: 6,
  isDrawing: false,
  history: loadHistory(),
  projectName: "未命名作品",
  selectedTemplateId: null,

  setLayers: (layers) => set({ layers }),

  updateLayer: (index, updates) =>
    set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, ...updates } : l
      ),
    })),

  setLight: (light) =>
    set((state) => ({ light: { ...state.light, ...light } })),

  setRotation: (rx, ry) => set({ rotationX: rx, rotationY: ry }),

  setActiveLayerIndex: (index) => set({ activeLayerIndex: index }),

  setBrushSize: (size) => set({ brushSize: size }),

  setIsDrawing: (drawing) => set({ isDrawing: drawing }),

  loadTemplate: (templateId) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      set({
        layers: tmpl.layers.map((l) => ({ ...l })),
        light: { ...tmpl.light },
        selectedTemplateId: templateId,
        projectName: tmpl.nameZh,
      });
    }
  },

  loadBlank: () => {
    const b = createBlankProject();
    set({
      layers: b.layers,
      light: b.light,
      selectedTemplateId: null,
      projectName: "未命名作品",
    });
  },

  saveToHistory: () => {
    const state = get();
    const project: ProjectConfig = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: state.projectName,
      layers: state.layers.map((l) => ({ ...l })),
      light: { ...state.light },
      updatedAt: new Date().toISOString(),
    };
    const newHistory = [project, ...state.history].slice(0, 20);
    set({ history: newHistory });
    saveHistory(newHistory);
  },

  loadFromHistory: (id) => {
    const state = get();
    const project = state.history.find((p) => p.id === id);
    if (project) {
      set({
        layers: project.layers.map((l) => ({ ...l })),
        light: { ...project.light },
        projectName: project.name,
        selectedTemplateId: null,
      });
    }
  },

  deleteFromHistory: (id) => {
    const state = get();
    const newHistory = state.history.filter((p) => p.id !== id);
    set({ history: newHistory });
    saveHistory(newHistory);
  },

  setProjectName: (name) => set({ projectName: name }),
}));
