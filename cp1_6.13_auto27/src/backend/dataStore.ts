import { v4 as uuidv4 } from 'uuid';
import { Announcement, TagType, User, CreateAnnouncementDto } from './types';

const announcements = new Map<string, Announcement>();
const users = new Map<string, User>();

const mockUsers: User[] = [
  { id: 'user-1', name: '张小明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { id: 'user-2', name: '李小红', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { id: 'user-3', name: '王大伟', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
  { id: 'user-4', name: '陈小芳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 'user-5', name: '刘建国', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
  { id: 'user-6', name: '赵美丽', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma' },
  { id: 'user-7', name: '孙志强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
  { id: 'user-8', name: '周小雨', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa' },
];

mockUsers.forEach(user => users.set(user.id, user));

const sampleTitles = [
  '本周产品迭代计划讨论',
  '技术分享会：React 18新特性',
  '下周五团建活动通知',
  '服务器维护公告',
  '新成员入职欢迎',
  '季度业绩汇报',
  '安全意识培训',
  '项目进度同步',
  '客户需求变更通知',
  '代码评审规范更新',
  '办公室搬迁通知',
  '年度体检安排',
  '新技术选型讨论',
  '年终奖发放说明',
  '春节放假安排',
  '产品发布会筹备',
  'Bug修复进度通报',
  '团队建设问卷调查',
  '数据库迁移计划',
  '性能优化成果展示',
  '新功能上线公告',
  '用户反馈处理进展',
  '敏捷开发流程培训',
  '系统升级维护通知',
  '销售目标达成情况',
  '设计稿评审会议',
  '接口文档更新说明',
  '周五下午茶活动',
  '招聘信息发布',
  '试用期转正评估',
  '项目延期说明',
  '客户拜访安排',
  '技术债务清理计划',
  '域名续费提醒',
  '备份策略优化',
  '竞品分析报告',
  '团队扩容计划',
  'API限流策略调整',
  '日志系统升级',
  '监控告警配置优化',
  'CDN加速部署',
  '移动端适配进展',
  'SEO优化方案',
  '用户调研结果',
  '支付系统升级',
  '邮件服务迁移',
  '图片存储方案选型',
  '数据备份演练',
  'SSL证书更新提醒',
  '服务器扩容申请',
];

const sampleContents = [
  '大家好，本周我们将讨论产品迭代计划。请各部门负责人提前准备好相关材料，会议定于周三下午2点在大会议室举行。\n\n主要议题：\n1. **上阶段工作总结**\n2. **下阶段目标规划**\n3. **资源调配讨论**\n\n请准时参加！',
  '本次技术分享会将深入探讨React 18的新特性，包括并发渲染、自动批处理、Suspense改进等。\n\n**时间**：周四下午3点\n**地点**：技术部会议室\n**主讲人**：王大伟\n\n欢迎所有对前端技术感兴趣的同学参加。',
  '为了增强团队凝聚力，公司决定组织一次团建活动。\n\n**时间**：下周五下午2点至晚上8点\n**地点**：郊外拓展基地\n**活动内容**：户外拓展、烧烤晚会、团队游戏\n\n请大家在周三前报名，有特殊情况请提前告知。',
  '为了提升服务器性能和稳定性，我们计划进行一次服务器维护。\n\n**维护时间**：本周六凌晨2点至6点\n**影响范围**：所有内部系统可能短暂中断\n\n请大家提前做好相关准备，感谢理解与配合。',
  '我们很高兴地宣布，新同事[姓名]将于下周一正式加入我们团队，担任[职位]一职。\n\n请大家热烈欢迎新同事的加入，希望在未来的工作中能够互相帮助、共同进步！',
];

const allTags: TagType[] = ['紧急', '技术', '团建', '通知', '其他'];

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateMockAnnouncements(): void {
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    const titleIndex = i % sampleTitles.length;
    const contentIndex = i % sampleContents.length;
    const userIndex = i % mockUsers.length;
    const tagCount = Math.floor(Math.random() * 3) + 1;
    const tags = getRandomItems(allTags, tagCount);
    const readCount = Math.floor(Math.random() * 8);
    const readBy = getRandomItems(mockUsers.map(u => u.id), readCount);

    const announcement: Announcement = {
      id: uuidv4(),
      title: sampleTitles[titleIndex],
      content: sampleContents[contentIndex],
      tags,
      author: mockUsers[userIndex],
      createdAt: now - i * 3600000 - Math.floor(Math.random() * 1800000),
      readCount,
      readBy,
    };

    announcements.set(announcement.id, announcement);
  }
}

generateMockAnnouncements();

export function getAllAnnouncements(
  tags?: TagType[],
  sortBy: 'latest' | 'mostRead' = 'latest'
): Announcement[] {
  let result = Array.from(announcements.values());

  if (tags && tags.length > 0) {
    result = result.filter(a => tags.some(tag => a.tags.includes(tag)));
  }

  if (sortBy === 'latest') {
    result.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    result.sort((a, b) => b.readCount - a.readCount);
  }

  return result;
}

export function getAnnouncementById(id: string): Announcement | undefined {
  return announcements.get(id);
}

export function createAnnouncement(dto: CreateAnnouncementDto): Announcement | null {
  const author = users.get(dto.authorId);
  if (!author) return null;

  const announcement: Announcement = {
    id: uuidv4(),
    title: dto.title,
    content: dto.content,
    tags: dto.tags,
    author,
    createdAt: Date.now(),
    readCount: 0,
    readBy: [],
  };

  announcements.set(announcement.id, announcement);
  return announcement;
}

export function markAsRead(id: string, userId: string): Announcement | null {
  const announcement = announcements.get(id);
  if (!announcement) return null;

  if (!announcement.readBy.includes(userId)) {
    announcement.readBy.push(userId);
    announcement.readCount += 1;
  }

  return announcement;
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getReadUsers(readBy: string[]): User[] {
  return readBy.map(id => users.get(id)).filter((u): u is User => u !== undefined).slice(0, 5);
}

export function getAnnouncementsAfter(timestamp: number): Announcement[] {
  return Array.from(announcements.values())
    .filter(a => a.createdAt > timestamp)
    .sort((a, b) => b.createdAt - a.createdAt);
}
