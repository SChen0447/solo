import { Task, Dependency } from './types';

export const sampleTasks: Task[] = [
  {
    id: 'task-1',
    name: '需求调研',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    progress: 100,
    assignee: '张三',
    dependencies: [],
    description: '用户需求收集与分析',
    notes: '已完成所有用户访谈'
  },
  {
    id: 'task-2',
    name: 'UI设计',
    startDate: '2026-06-06',
    endDate: '2026-06-10',
    progress: 85,
    assignee: '李四',
    dependencies: ['task-1'],
    description: '界面原型与视觉设计',
    notes: '主要页面设计完成，细节调整中'
  },
  {
    id: 'task-3',
    name: '数据库设计',
    startDate: '2026-06-06',
    endDate: '2026-06-09',
    progress: 100,
    assignee: '王五',
    dependencies: ['task-1'],
    description: '数据库表结构设计与优化',
    notes: '已完成ER图和DDL脚本'
  },
  {
    id: 'task-4',
    name: '前端开发',
    startDate: '2026-06-11',
    endDate: '2026-06-20',
    progress: 45,
    assignee: '赵六',
    dependencies: ['task-2'],
    description: 'React组件开发与页面实现',
    notes: '核心模块开发中'
  },
  {
    id: 'task-5',
    name: '后端开发',
    startDate: '2026-06-10',
    endDate: '2026-06-22',
    progress: 60,
    assignee: '孙七',
    dependencies: ['task-3'],
    description: 'API接口与业务逻辑实现',
    notes: '用户模块已完成'
  },
  {
    id: 'task-6',
    name: '接口联调',
    startDate: '2026-06-18',
    endDate: '2026-06-25',
    progress: 20,
    assignee: '周八',
    dependencies: ['task-4', 'task-5'],
    description: '前后端接口对接与调试',
    notes: '登录接口联调完成'
  },
  {
    id: 'task-7',
    name: '测试用例编写',
    startDate: '2026-06-15',
    endDate: '2026-06-23',
    progress: 55,
    assignee: '吴九',
    dependencies: ['task-2'],
    description: '功能测试用例与自动化脚本',
    notes: '核心流程用例已完成'
  },
  {
    id: 'task-8',
    name: '系统测试',
    startDate: '2026-06-24',
    endDate: '2026-06-30',
    progress: 0,
    assignee: '郑十',
    dependencies: ['task-6', 'task-7'],
    description: '集成测试与性能测试',
    notes: '等待联调完成后开始'
  },
  {
    id: 'task-9',
    name: '部署上线',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    progress: 0,
    assignee: '张三',
    dependencies: ['task-8'],
    description: '生产环境部署与发布',
    notes: '待测试通过后执行'
  },
  {
    id: 'task-10',
    name: '文档编写',
    startDate: '2026-06-20',
    endDate: '2026-06-28',
    progress: 30,
    assignee: '李四',
    dependencies: ['task-4', 'task-5'],
    description: '开发文档与用户手册',
    notes: 'API文档进行中'
  }
];

export const sampleDependencies: Dependency[] = [
  { source: 'task-1', target: 'task-2', description: '需求完成后开始设计', delayDays: 0 },
  { source: 'task-1', target: 'task-3', description: '需求完成后开始数据库设计', delayDays: 0 },
  { source: 'task-2', target: 'task-4', description: '设计稿完成后开始前端开发', delayDays: 1 },
  { source: 'task-3', target: 'task-5', description: '数据库设计完成后开始后端开发', delayDays: 0 },
  { source: 'task-4', target: 'task-6', description: '前端功能完成后开始联调', delayDays: 0 },
  { source: 'task-5', target: 'task-6', description: '后端接口完成后开始联调', delayDays: 0 },
  { source: 'task-2', target: 'task-7', description: '设计完成后开始编写测试用例', delayDays: 2 },
  { source: 'task-6', target: 'task-8', description: '联调完成后开始系统测试', delayDays: 1 },
  { source: 'task-7', target: 'task-8', description: '测试用例完成后开始执行测试', delayDays: 0 },
  { source: 'task-8', target: 'task-9', description: '测试通过后部署上线', delayDays: 0 },
  { source: 'task-4', target: 'task-10', description: '前端开发中同步编写文档', delayDays: 3 },
  { source: 'task-5', target: 'task-10', description: '后端开发中同步编写文档', delayDays: 3 }
];

export const getTaskDuration = (task: Task): number => {
  const start = new Date(task.startDate).getTime();
  const end = new Date(task.endDate).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};
