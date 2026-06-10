import Dexie, { Table } from 'dexie'
import { Task, TeamData } from './types'

export class AppDatabase extends Dexie {
  tasks!: Table<Task, string>
  team!: Table<TeamData, string>

  constructor() {
    super('TeamTaskBoard')
    this.version(1).stores({
      tasks: 'id, column, assigneeId, priority, startDate, dueDate',
      team: 'name'
    })
  }

  async getAllTasks(): Promise<Task[]> {
    return this.tasks.toArray()
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return this.tasks.get(id)
  }

  async addTask(task: Task): Promise<string> {
    return this.tasks.add(task)
  }

  async updateTask(id: string, changes: Partial<Task>): Promise<number> {
    return this.tasks.update(id, { ...changes, updatedAt: Date.now() })
  }

  async deleteTask(id: string): Promise<void> {
    return this.tasks.delete(id)
  }

  async getTeam(): Promise<TeamData | undefined> {
    const teams = await this.team.toArray()
    return teams[0]
  }

  async saveTeam(team: TeamData): Promise<string> {
    await this.team.clear()
    return this.team.add(team)
  }

  async clearAll(): Promise<void> {
    await this.tasks.clear()
    await this.team.clear()
  }
}

export const db = new AppDatabase()
