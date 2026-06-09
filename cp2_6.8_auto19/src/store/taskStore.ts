import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { timeToMinutes, isTimeConflict } from '@/utils/timeUtils'

export type Priority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  priority: Priority
  startTime: string
  endTime: string
  note?: string
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([
    {
      id: '1',
      title: '晨间运动',
      priority: 'medium',
      startTime: '07:00',
      endTime: '08:00',
      note: '跑步30分钟 + 拉伸'
    },
    {
      id: '2',
      title: '重要会议',
      priority: 'high',
      startTime: '09:30',
      endTime: '11:00',
      note: '项目评审会议'
    },
    {
      id: '3',
      title: '午餐休息',
      priority: 'low',
      startTime: '12:00',
      endTime: '13:30'
    },
    {
      id: '4',
      title: '代码开发',
      priority: 'high',
      startTime: '14:00',
      endTime: '17:00',
      note: '完成登录模块'
    },
    {
      id: '5',
      title: '阅读学习',
      priority: 'low',
      startTime: '20:00',
      endTime: '21:30',
      note: '技术书籍阅读'
    }
  ])

  const conflictTaskIds = ref<Set<string>>(new Set())

  const sortedTasks = computed(() => {
    return [...tasks.value].sort((a, b) => {
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    })
  })

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  function checkConflict(task: Task, excludeId?: string): Task[] {
    const conflicts: Task[] = []
    for (const t of tasks.value) {
      if (excludeId && t.id === excludeId) continue
      if (isTimeConflict(task, t)) {
        conflicts.push(t)
      }
    }
    return conflicts
  }

  function updateConflictStatus() {
    const conflicts = new Set<string>()
    for (let i = 0; i < tasks.value.length; i++) {
      for (let j = i + 1; j < tasks.value.length; j++) {
        if (isTimeConflict(tasks.value[i], tasks.value[j])) {
          conflicts.add(tasks.value[i].id)
          conflicts.add(tasks.value[j].id)
        }
      }
    }
    conflictTaskIds.value = conflicts
  }

  function addTask(task: Omit<Task, 'id'>): { success: boolean; conflicts?: Task[] } {
    const newTask: Task = {
      ...task,
      id: generateId()
    }
    const conflicts = checkConflict(newTask)
    if (conflicts.length > 0) {
      return { success: false, conflicts }
    }
    tasks.value.push(newTask)
    updateConflictStatus()
    return { success: true }
  }

  function editTask(id: string, task: Partial<Omit<Task, 'id'>>): { success: boolean; conflicts?: Task[] } {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index === -1) return { success: false }

    const updatedTask = { ...tasks.value[index], ...task }
    const conflicts = checkConflict(updatedTask, id)
    if (conflicts.length > 0) {
      return { success: false, conflicts }
    }

    tasks.value[index] = updatedTask
    updateConflictStatus()
    return { success: true }
  }

  function deleteTask(id: string): void {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      updateConflictStatus()
    }
  }

  function updateTaskTime(id: string, startTime: string, endTime: string): { success: boolean; conflicts?: Task[] } {
    return editTask(id, { startTime, endTime })
  }

  function isTaskConflicted(taskId: string): boolean {
    return conflictTaskIds.value.has(taskId)
  }

  function forceAddTask(task: Omit<Task, 'id'>): void {
    const newTask: Task = {
      ...task,
      id: generateId()
    }
    tasks.value.push(newTask)
    updateConflictStatus()
  }

  function forceEditTask(id: string, task: Partial<Omit<Task, 'id'>>): void {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...task }
      updateConflictStatus()
    }
  }

  return {
    tasks,
    conflictTaskIds,
    sortedTasks,
    addTask,
    editTask,
    deleteTask,
    checkConflict,
    updateTaskTime,
    isTaskConflicted,
    forceAddTask,
    forceEditTask,
    updateConflictStatus
  }
})
