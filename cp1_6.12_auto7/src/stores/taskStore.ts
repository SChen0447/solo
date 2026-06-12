import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Priority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  listId: string
}

export interface TaskList {
  id: string
  name: string
}

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9)

export const useTaskStore = defineStore('task', () => {
  const lists = ref<TaskList[]>([
    { id: generateId(), name: '待办' },
    { id: generateId(), name: '进行中' },
    { id: generateId(), name: '已完成' }
  ])

  const tasks = ref<Task[]>([
    {
      id: generateId(),
      title: '设计系统架构',
      description: '完成项目整体架构设计文档，包括模块划分和技术选型',
      priority: 'high',
      listId: ''
    },
    {
      id: generateId(),
      title: '编写单元测试',
      description: '为核心模块编写单元测试用例，覆盖率达到80%以上',
      priority: 'medium',
      listId: ''
    },
    {
      id: generateId(),
      title: '代码审查',
      description: '团队成员之间进行交叉代码审查',
      priority: 'low',
      listId: ''
    },
    {
      id: generateId(),
      title: '用户登录功能',
      description: '实现用户登录、注册和密码重置功能',
      priority: 'high',
      listId: ''
    },
    {
      id: generateId(),
      title: '数据库优化',
      description: '优化慢查询，添加必要的索引',
      priority: 'medium',
      listId: ''
    },
    {
      id: generateId(),
      title: '项目初始化',
      description: '初始化项目脚手架，配置开发环境',
      priority: 'low',
      listId: ''
    }
  ])

  tasks.value[0].listId = lists.value[0].id
  tasks.value[1].listId = lists.value[0].id
  tasks.value[2].listId = lists.value[1].id
  tasks.value[3].listId = lists.value[1].id
  tasks.value[4].listId = lists.value[2].id
  tasks.value[5].listId = lists.value[2].id

  const searchQuery = ref('')
  const draggedTaskId = ref<string | null>(null)

  const filteredTasks = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) {
      return tasks.value.map((task) => ({ ...task, matched: true }))
    }
    return tasks.value.map((task) => {
      const matched =
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      return { ...task, matched }
    })
  })

  const getTasksByListId = (listId: string) => {
    return computed(() =>
      filteredTasks.value.filter((task) => task.listId === listId)
    )
  }

  const addList = (name: string) => {
    lists.value.push({ id: generateId(), name })
  }

  const removeList = (listId: string) => {
    lists.value = lists.value.filter((list) => list.id !== listId)
    tasks.value = tasks.value.filter((task) => task.listId !== listId)
  }

  const addTask = (
    listId: string,
    title: string,
    description: string,
    priority: Priority
  ) => {
    tasks.value.push({
      id: generateId(),
      title,
      description,
      priority,
      listId
    })
  }

  const updateTask = (
    taskId: string,
    data: Partial<Omit<Task, 'id'>>
  ) => {
    const index = tasks.value.findIndex((task) => task.id === taskId)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...data }
    }
  }

  const removeTask = (taskId: string) => {
    tasks.value = tasks.value.filter((task) => task.id !== taskId)
  }

  const moveTask = (
    taskId: string,
    targetListId: string,
    targetIndex: number
  ) => {
    const taskIndex = tasks.value.findIndex((task) => task.id === taskId)
    if (taskIndex === -1) return

    const [task] = tasks.value.splice(taskIndex, 1)
    task.listId = targetListId

    const listTasks = tasks.value.filter((t) => t.listId === targetListId)
    const insertIndex = Math.min(targetIndex, listTasks.length)

    let globalInsertIndex = 0
    let count = 0
    for (let i = 0; i < tasks.value.length; i++) {
      if (tasks.value[i].listId === targetListId) {
        if (count === insertIndex) {
          globalInsertIndex = i
          break
        }
        count++
      }
      globalInsertIndex = i + 1
    }

    tasks.value.splice(globalInsertIndex, 0, task)
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const setDraggedTaskId = (taskId: string | null) => {
    draggedTaskId.value = taskId
  }

  return {
    lists,
    tasks,
    searchQuery,
    draggedTaskId,
    filteredTasks,
    getTasksByListId,
    addList,
    removeList,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    setSearchQuery,
    setDraggedTaskId
  }
})
