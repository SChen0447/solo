import { create } from 'zustand';
import {
  Project,
  Task,
  ColumnId,
  Priority,
  FilterType,
  COLUMN_TITLES,
} from './types';

interface StoreState {
  projects: Record<string, Project>;
  currentProjectId: string | null;
  searchQuery: string;
  filterType: FilterType;
  selectedTaskId: string | null;
  currentUser: string;

  createProject: (name: string) => string;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (projectId: string) => void;

  addTask: (projectId: string, title: string, columnId: ColumnId) => string;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  moveTask: (
    projectId: string,
    taskId: string,
    fromColumn: ColumnId,
    toColumn: ColumnId,
    toIndex: number
  ) => void;

  setSearchQuery: (query: string) => void;
  setFilterType: (type: FilterType) => void;
  setSelectedTaskId: (taskId: string | null) => void;

  recordBurndown: (projectId: string) => void;
  resetSprint: (projectId: string, days?: number) => void;

  getFilteredTasks: (projectId: string) => Task[];
  getCurrentProject: () => Project | null;
}

const STORAGE_KEY = 'agile-kanban-store';

const generateId = () => Math.random().toString(36).slice(2, 11);

const getToday = () => new Date().toISOString().split('T')[0];

const createEmptyColumns = (): Record<ColumnId, { id: ColumnId; title: string; taskIds: string[] }> => ({
  todo: { id: 'todo', title: COLUMN_TITLES.todo, taskIds: [] },
  inProgress: { id: 'inProgress', title: COLUMN_TITLES.inProgress, taskIds: [] },
  done: { id: 'done', title: COLUMN_TITLES.done, taskIds: [] },
});

const createDemoProject = (): Project => {
  const projectId = generateId();
  const columns = createEmptyColumns();
  const tasks: Record<string, Task> = {};

  const demoTasks: Array<{ title: string; description: string; priority: Priority; column: ColumnId; dueDate: string | null }> = [
    { title: '设计用户界面原型', description: '完成首页和看板页面的高保真设计稿\n- 配色方案确定\n- 交互流程设计', priority: 'high', column: 'todo', dueDate: null },
    { title: '搭建项目基础架构', description: '使用 **Vite + React + TypeScript** 初始化项目', priority: 'urgent', column: 'inProgress', dueDate: getToday() },
    { title: '实现拖拽功能', description: '集成 @dnd-kit 实现看板拖拽排序', priority: 'medium', column: 'todo', dueDate: null },
    { title: '编写 API 接口文档', description: '整理 RESTful API 规范', priority: 'low', column: 'done', dueDate: null },
    { title: '需求评审会议', description: '与产品经理确认 Sprint 目标', priority: 'high', column: 'done', dueDate: null },
  ];

  demoTasks.forEach((t) => {
    const taskId = generateId();
    tasks[taskId] = {
      id: taskId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.dueDate,
      columnId: t.column,
      assignee: '我',
      createdAt: Date.now(),
    };
    columns[t.column].taskIds.push(taskId);
  });

  return {
    id: projectId,
    name: '默认项目',
    columns,
    tasks,
    sprintDays: 7,
    sprintStartDate: getToday(),
    burndownHistory: [{ date: getToday(), remaining: Object.keys(tasks).filter((id) => tasks[id].columnId !== 'done').length }],
    createdAt: Date.now(),
  };
};

const loadFromStorage = (): Partial<StoreState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
};

const saveToStorage = (state: Partial<StoreState>) => {
  try {
    const { projects, currentProjectId, currentUser } = state;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projects, currentProjectId, currentUser })
    );
  } catch {
    // ignore
  }
};

export const useStore = create<StoreState>((set, get) => {
  const persisted = loadFromStorage();
  let initialProjects = persisted.projects as Record<string, Project> | undefined;
  let initialCurrentProjectId = persisted.currentProjectId as string | null | undefined;

  if (!initialProjects || Object.keys(initialProjects).length === 0) {
    const demo = createDemoProject();
    initialProjects = { [demo.id]: demo };
    initialCurrentProjectId = demo.id;
  }

  return {
    projects: initialProjects!,
    currentProjectId: initialCurrentProjectId ?? null,
    searchQuery: '',
    filterType: 'all',
    selectedTaskId: null,
    currentUser: (persisted.currentUser as string) || '我',

    createProject: (name) => {
      const projectId = generateId();
      const newProject: Project = {
        id: projectId,
        name,
        columns: createEmptyColumns(),
        tasks: {},
        sprintDays: 7,
        sprintStartDate: getToday(),
        burndownHistory: [{ date: getToday(), remaining: 0 }],
        createdAt: Date.now(),
      };
      set((state) => {
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: newProject },
          currentProjectId: projectId,
        };
        saveToStorage(newState);
        return newState;
      });
      return projectId;
    },

    deleteProject: (projectId) => {
      set((state) => {
        const { [projectId]: _, ...rest } = state.projects;
        const remainingIds = Object.keys(rest);
        const newState = {
          ...state,
          projects: rest,
          currentProjectId: remainingIds.length > 0 ? remainingIds[0] : null,
        };
        saveToStorage(newState);
        return newState;
      });
    },

    setCurrentProject: (projectId) => {
      set((state) => {
        const newState = { ...state, currentProjectId: projectId };
        saveToStorage(newState);
        return newState;
      });
    },

    addTask: (projectId, title, columnId) => {
      const taskId = generateId();
      const newTask: Task = {
        id: taskId,
        title,
        description: '',
        priority: 'medium',
        dueDate: null,
        columnId,
        assignee: get().currentUser,
        createdAt: Date.now(),
      };
      set((state) => {
        const project = state.projects[projectId];
        if (!project) return state;
        const updatedProject: Project = {
          ...project,
          tasks: { ...project.tasks, [taskId]: newTask },
          columns: {
            ...project.columns,
            [columnId]: {
              ...project.columns[columnId],
              taskIds: [...project.columns[columnId].taskIds, taskId],
            },
          },
        };
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: updatedProject },
        };
        saveToStorage(newState);
        return newState;
      });
      return taskId;
    },

    updateTask: (projectId, taskId, updates) => {
      set((state) => {
        const project = state.projects[projectId];
        if (!project || !project.tasks[taskId]) return state;
        const updatedProject: Project = {
          ...project,
          tasks: {
            ...project.tasks,
            [taskId]: { ...project.tasks[taskId], ...updates },
          },
        };
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: updatedProject },
        };
        saveToStorage(newState);
        return newState;
      });
    },

    deleteTask: (projectId, taskId) => {
      set((state) => {
        const project = state.projects[projectId];
        if (!project || !project.tasks[taskId]) return state;
        const task = project.tasks[taskId];
        const { [taskId]: _, ...restTasks } = project.tasks;
        const updatedProject: Project = {
          ...project,
          tasks: restTasks,
          columns: {
            ...project.columns,
            [task.columnId]: {
              ...project.columns[task.columnId],
              taskIds: project.columns[task.columnId].taskIds.filter((id) => id !== taskId),
            },
          },
        };
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: updatedProject },
          selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
        };
        saveToStorage(newState);
        return newState;
      });
    },

    moveTask: (projectId, taskId, fromColumn, toColumn, toIndex) => {
      set((state) => {
        const project = state.projects[projectId];
        if (!project) return state;

        const fromTaskIds = project.columns[fromColumn].taskIds.filter((id) => id !== taskId);
        const toTaskIds = [...project.columns[toColumn].taskIds.filter((id) => id !== taskId)];
        toTaskIds.splice(toIndex, 0, taskId);

        const updatedTask: Task | undefined = project.tasks[taskId]
          ? { ...project.tasks[taskId], columnId: toColumn }
          : undefined;

        const updatedProject: Project = {
          ...project,
          tasks: updatedTask ? { ...project.tasks, [taskId]: updatedTask } : project.tasks,
          columns: {
            ...project.columns,
            [fromColumn]: { ...project.columns[fromColumn], taskIds: fromTaskIds },
            [toColumn]: { ...project.columns[toColumn], taskIds: toTaskIds },
          },
        };
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: updatedProject },
        };
        saveToStorage(newState);
        return newState;
      });
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilterType: (type) => set({ filterType: type }),
    setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),

    recordBurndown: (projectId) => {
      set((state) => {
        const project = state.projects[projectId];
        if (!project) return state;
        const remaining = Object.values(project.tasks).filter((t) => t.columnId !== 'done').length;
        const today = getToday();
        const history = [...project.burndownHistory];
        const lastEntry = history[history.length - 1];
        if (lastEntry && lastEntry.date === today) {
          history[history.length - 1] = { date: today, remaining };
        } else {
          history.push({ date: today, remaining });
        }
        const updatedProject = { ...project, burndownHistory: history };
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: updatedProject },
        };
        saveToStorage(newState);
        return newState;
      });
    },

    resetSprint: (projectId, days = 7) => {
      set((state) => {
        const project = state.projects[projectId];
        if (!project) return state;
        const remaining = Object.values(project.tasks).filter((t) => t.columnId !== 'done').length;
        const updatedProject = {
          ...project,
          sprintDays: days,
          sprintStartDate: getToday(),
          burndownHistory: [{ date: getToday(), remaining }],
        };
        const newState = {
          ...state,
          projects: { ...state.projects, [projectId]: updatedProject },
        };
        saveToStorage(newState);
        return newState;
      });
    },

    getFilteredTasks: (projectId) => {
      const state = get();
      const project = state.projects[projectId];
      if (!project) return [];
      const { searchQuery, filterType, currentUser } = state;
      const query = searchQuery.toLowerCase().trim();

      return Object.values(project.tasks).filter((task) => {
        if (query) {
          const matchesQuery =
            task.title.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query);
          if (!matchesQuery) return false;
        }
        if (filterType === 'mine' && task.assignee !== currentUser) return false;
        if (filterType === 'highPriority' && task.priority !== 'urgent' && task.priority !== 'high') return false;
        return true;
      });
    },

    getCurrentProject: () => {
      const state = get();
      return state.currentProjectId ? state.projects[state.currentProjectId] ?? null : null;
    },
  };
});
