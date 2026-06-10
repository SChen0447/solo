export enum Stage {
  Storyboard = 'storyboard',
  LineArt = 'lineart',
  Coloring = 'coloring',
  Finished = 'finished'
}

export const StageLabels: Record<Stage, string> = {
  [Stage.Storyboard]: '分镜',
  [Stage.LineArt]: '线稿',
  [Stage.Coloring]: '上色',
  [Stage.Finished]: '完稿'
}

export const StageColors: Record<Stage, string> = {
  [Stage.Storyboard]: '#f59e0b',
  [Stage.LineArt]: '#3b82f6',
  [Stage.Coloring]: '#10b981',
  [Stage.Finished]: '#8b5cf6'
}

export const StageOrder: Stage[] = [
  Stage.Storyboard,
  Stage.LineArt,
  Stage.Coloring,
  Stage.Finished
]

export interface Chapter {
  id: string
  projectId: string
  chapterNumber: number
  title: string
  currentStage: Stage
  stageProgress: Record<Stage, number>
  chengengCount: number
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  title: string
  description: string
  coverColor: string
  chapters: Chapter[]
  createdAt: number
  updatedAt: number
}

export interface ChengengVote {
  id: string
  chapterId: string
  projectId: string
  votedAt: number
}

export type AppView = 'project-list' | 'project-detail'
