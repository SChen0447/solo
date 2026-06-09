import './styles.css';
import { Meeting, ActionItem, ActionStatus } from './types';

const API_BASE = '/api';

interface AppState {
  meetings: Meeting[];
  searchQuery: string;
  filterUncompletedOnly: boolean;
}

const state: AppState = {
  meetings: [],
  searchQuery: '',
  filterUncompletedOnly: false
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  'todo': '待办',
  'in-progress': '进行中',
  'done': '已完成'
};

async function fetchMeetings(): Promise<Meeting[]> {
  const response = await fetch(`${API_BASE}/meetings`);
  if (!response.ok) throw new Error('获取会议列表失败');
  return response.json();
}

async function createMeeting(title: string, date: string, description: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, date, description })
  });
  if (!response.ok) throw new Error('创建会议失败');
  return response.json();
}

async function createAction(meetingId: string, description: string, assignee: string, dueDate: string): Promise<ActionItem> {
  const response = await fetch(`${API_BASE}/meetings/${meetingId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, assignee, dueDate })
  });
  if (!response.ok) throw new Error('创建动作项失败');
  return response.json();
}

async function toggleActionStatus(actionId: string): Promise<ActionItem> {
  const response = await fetch(`${API_BASE}/actions/${actionId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('更新状态失败');
  return response.json();
}

function getFilteredMeetings(): Meeting[] {
  let filtered = [...state.meetings];

  if (state.filterUncompletedOnly) {
    filtered = filtered.filter(m => 
      m.actionItems.some(a => a.status !== 'done')
    );
  }

  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(m => {
      if (m.title.toLowerCase().includes(query)) return true;
      if (m.description.toLowerCase().includes(query)) return true;
      return m.actionItems.some(a => 
        a.description.toLowerCase().includes(query) ||
        a.assignee.toLowerCase().includes(query)
      );
    });
  }

  return filtered;
}

function calculateProgress(meeting: Meeting): number {
  if (meeting.actionItems.length === 0) return 0;
  const done = meeting.actionItems.filter(a => a.status === 'done').length;
  return Math.round((done / meeting.actionItems.length) * 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function isOverdue(dueDate: string, status: ActionStatus): boolean {
  if (status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function render() {
  const kanbanBoard = document.getElementById('kanban-board');
  if (!kanbanBoard) return;

  const filtered = getFilteredMeetings();

  if (filtered.length === 0) {
    kanbanBoard.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">
          ${state.meetings.length === 0 ? '暂无会议记录，点击左侧创建第一个会议吧！' : '没有找到匹配的会议'}
        </div>
      </div>
    `;
    return;
  }

  kanbanBoard.innerHTML = filtered.map(meeting => renderMeetingCard(meeting)).join('');

  bindCardEvents();
}

function renderMeetingCard(meeting: Meeting): string {
  const progress = calculateProgress(meeting);
  const doneCount = meeting.actionItems.filter(a => a.status === 'done').length;
  const totalCount = meeting.actionItems.length;

  return `
    <div class="meeting-card" data-meeting-id="${meeting.id}">
      <div class="card-header">
        <div>
          <h3 class="card-title">${escapeHtml(meeting.title)}</h3>
          <div class="card-date">${formatDate(meeting.date)}</div>
        </div>
      </div>
      ${meeting.description ? `<div class="card-desc">${escapeHtml(meeting.description)}</div>` : ''}
      
      ${totalCount > 0 ? `
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${doneCount}/${totalCount} 已完成</div>
        </div>
      ` : ''}

      <ul class="action-list">
        ${meeting.actionItems.map(action => renderActionItem(action)).join('')}
      </ul>

      <div class="add-action-section">
        <button class="add-action-btn" data-toggle-action-form="${meeting.id}">
          + 添加动作项
        </button>
        <div class="add-action-form" id="action-form-${meeting.id}" style="display: none;">
          <div class="form-row">
            <input type="text" placeholder="任务描述" data-action-desc="${meeting.id}" />
          </div>
          <div class="form-row">
            <input type="text" placeholder="负责人" data-action-assignee="${meeting.id}" />
            <input type="date" data-action-duedate="${meeting.id}" />
          </div>
          <div class="form-row">
            <button class="btn btn-primary btn-small" data-submit-action="${meeting.id}">添加</button>
            <button class="btn btn-secondary btn-small" data-cancel-action="${meeting.id}">取消</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderActionItem(action: ActionItem): string {
  const overdue = isOverdue(action.dueDate, action.status);
  return `
    <li class="action-item ${action.status}" data-action-id="${action.id}">
      <div class="status-dot ${action.status}" data-status-toggle="${action.id}" title="点击切换状态"></div>
      <div class="action-content">
        <div class="action-desc">${escapeHtml(action.description)}</div>
        <div class="action-meta">
          <span class="assignee-tag">${escapeHtml(action.assignee)}</span>
          <span class="due-date ${overdue ? 'overdue' : ''}">
            ${STATUS_LABELS[action.status]} · ${formatDate(action.dueDate)}
          </span>
        </div>
      </div>
    </li>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function bindCardEvents() {
  document.querySelectorAll('[data-toggle-action-form]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const meetingId = (e.target as HTMLElement).getAttribute('data-toggle-action-form');
      const form = document.getElementById(`action-form-${meetingId}`);
      if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  document.querySelectorAll('[data-cancel-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const meetingId = (e.target as HTMLElement).getAttribute('data-cancel-action');
      const form = document.getElementById(`action-form-${meetingId}`);
      if (form) {
        form.style.display = 'none';
      }
    });
  });

  document.querySelectorAll('[data-submit-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const meetingId = (e.target as HTMLElement).getAttribute('data-submit-action');
      if (!meetingId) return;

      const descInput = document.querySelector(`[data-action-desc="${meetingId}"]`) as HTMLInputElement;
      const assigneeInput = document.querySelector(`[data-action-assignee="${meetingId}"]`) as HTMLInputElement;
      const dueDateInput = document.querySelector(`[data-action-duedate="${meetingId}"]`) as HTMLInputElement;

      if (!descInput || !assigneeInput || !dueDateInput) return;

      const description = descInput.value.trim();
      const assignee = assigneeInput.value.trim();
      const dueDate = dueDateInput.value;

      if (!description || !assignee || !dueDate) {
        alert('请填写完整的动作项信息');
        return;
      }

      try {
        const newAction = await createAction(meetingId, description, assignee, dueDate);
        const meeting = state.meetings.find(m => m.id === meetingId);
        if (meeting) {
          meeting.actionItems.push(newAction);
        }
        render();
      } catch (err) {
          console.error(err);
          alert('添加动作项失败');
        }
    });
  });

  document.querySelectorAll('[data-status-toggle]').forEach(dot => {
    dot.addEventListener('click', async (e) => {
      const actionId = (e.target as HTMLElement).getAttribute('data-status-toggle');
      if (!actionId) return;

      (e.target as HTMLElement).classList.add('pulse');
      setTimeout(() => {
        (e.target as HTMLElement).classList.remove('pulse');
      }, 600);

      handleStatusToggle(actionId);
    });
  });
}

async function handleStatusToggle(actionId: string) {
  try {
    const updated = await toggleActionStatus(actionId);
    
    for (const meeting of state.meetings) {
      const actionIndex = meeting.actionItems.findIndex(a => a.id === actionId);
      if (actionIndex !== -1) {
        meeting.actionItems[actionIndex] = updated;
        updateActionDom(actionId, updated);
        updateProgressDom(meeting.id);
        break;
      }
    }
  } catch (err) {
    console.error(err);
    alert('更新状态失败');
  }
}

function updateActionDom(actionId: string, action: ActionItem) {
  const actionEl = document.querySelector(`[data-action-id="${actionId}"]`);
  if (!actionEl) return;

  actionEl.className = `action-item ${action.status}`;

  const statusDot = actionEl.querySelector('.status-dot');
  if (statusDot) {
    statusDot.className = `status-dot ${action.status}`;
  }

  const dueDateEl = actionEl.querySelector('.due-date');
  if (dueDateEl) {
    const overdue = isOverdue(action.dueDate, action.status);
    dueDateEl.className = `due-date ${overdue ? 'overdue' : ''}`;
    dueDateEl.innerHTML = `${STATUS_LABELS[action.status]} · ${formatDate(action.dueDate)}`;
  }
}

function updateProgressDom(meetingId: string) {
  const meeting = state.meetings.find(m => m.id === meetingId);
  if (!meeting) return;

  const card = document.querySelector(`[data-meeting-id="${meetingId}"]`);
  if (!card) return;

  const progressFill = card.querySelector('.progress-fill');
  const progressText = card.querySelector('.progress-text');

  const progress = calculateProgress(meeting);
  const doneCount = meeting.actionItems.filter(a => a.status === 'done').length;
  const totalCount = meeting.actionItems.length;

  if (progressFill) {
    (progressFill as HTMLElement).style.width = `${progress}%`;
  }
  if (progressText) {
    progressText.textContent = `${doneCount}/${totalCount} 已完成`;
  }
}

let kanbanBoard: HTMLElement | null = null;

async function init() {
  const meetingForm = document.getElementById('meeting-form');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const filterBtn = document.getElementById('filter-uncompleted');
  const exportBtn = document.getElementById('export-btn');

  if (meetingForm) {
    meetingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      handleCreateMeeting();
    });
  }

  if (searchInput) {
    let debounceTimer: number;
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = (e.target as HTMLInputElement).value;
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        render();
      }, 150);
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      state.filterUncompletedOnly = !state.filterUncompletedOnly;
      filterBtn.classList.toggle('active', state.filterUncompletedOnly);
      render();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportToMarkdown);
  }

  kanbanBoard = document.getElementById('kanban-board');

  try {
    state.meetings = await fetchMeetings();
    render();
  } catch (err) {
    console.error(err);
    if (kanbanBoard) {
      kanbanBoard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-text">加载失败，请确认后端服务已启动</div>
        </div>
      `;
    }
  }
}

async function handleCreateMeeting() {
  const titleInput = document.getElementById('meeting-title') as HTMLInputElement;
  const dateInput = document.getElementById('meeting-date') as HTMLInputElement;
  const descInput = document.getElementById('meeting-desc') as HTMLTextAreaElement;

  const title = titleInput.value.trim();
  const date = dateInput.value;
  const description = descInput.value.trim();

  if (!title || !date) {
    alert('请填写会议标题和日期');
    return;
  }

  try {
    const newMeeting = await createMeeting(title, date, description);
    state.meetings.unshift(newMeeting);
    state.meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    render();
    
    titleInput.value = '';
    dateInput.value = '';
    descInput.value = '';
  } catch (err) {
    console.error(err);
    alert('创建会议失败');
  }
}

function exportToMarkdown() {
  let markdown = '# 会议纪要看板\n\n';

  const meetings = state.filterUncompletedOnly ? getFilteredMeetings() : state.meetings;

  if (meetings.length === 0) {
    markdown += '*暂无会议记录*\n';
  } else {
    for (const meeting of meetings) {
      markdown += `## ${meeting.title}\n\n`;
      markdown += `**日期:** ${formatDate(meeting.date)}\n\n`;
      
      if (meeting.description) {
        markdown += `> ${meeting.description}\n\n`;
      }

      markdown += '### 动作项\n\n';

      if (meeting.actionItems.length === 0) {
        markdown += '*暂无动作项*\n\n';
      } else {
        const statusIcons: Record<ActionStatus, string> = {
          'todo': '🔴',
          'in-progress': '🟡',
          'done': '🟢'
        };

        for (const action of meeting.actionItems) {
          markdown += `- ${statusIcons[action.status]} ${action.description}\n`;
          markdown += `  - 负责人: ${action.assignee}\n`;
          markdown += `  - 截止日期: ${formatDate(action.dueDate)}\n`;
          markdown += `  - 状态: ${STATUS_LABELS[action.status]}\n\n`;
        }
      }

      markdown += '---\n\n';
    }
  }

  navigator.clipboard.writeText(markdown).then(() => {
    alert('看板内容已复制到剪贴板！');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('看板内容已复制到剪贴板！');
  });
}

document.addEventListener('DOMContentLoaded', init);
