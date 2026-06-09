export interface Goal {
  id: string;
  description: string;
  completed: boolean;
  check: () => boolean;
}

export interface UIManagerCallbacks {
  onJumpToMarker: (index: number) => void;
}

export class UIManager {
  private timerDisplay: HTMLElement;
  private energyDisplay: HTMLElement;
  private goalsList: HTMLElement;
  private markersList: HTMLElement;
  private contextMenu: HTMLElement;
  private gameMessage: HTMLElement;
  private maxEnergy: number;
  private currentEnergy: number;
  private goals: Goal[] = [];
  private markerTimes: number[] = [];
  private callbacks: UIManagerCallbacks;

  constructor(maxEnergy: number, callbacks: UIManagerCallbacks) {
    this.timerDisplay = document.getElementById('timer-display')!;
    this.energyDisplay = document.getElementById('energy-display')!;
    this.goalsList = document.getElementById('goals-list')!;
    this.markersList = document.getElementById('markers-list')!;
    this.contextMenu = document.getElementById('context-menu')!;
    this.gameMessage = document.getElementById('game-message')!;
    this.maxEnergy = maxEnergy;
    this.currentEnergy = maxEnergy;
    this.callbacks = callbacks;

    this.renderEnergy();
    this.hideContextMenu();
  }

  updateTimer(remainingSeconds: number): void {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (remainingSeconds <= 60) {
      this.timerDisplay.classList.add('warning');
    } else {
      this.timerDisplay.classList.remove('warning');
    }
  }

  renderEnergy(): void {
    this.energyDisplay.innerHTML = '';
    for (let i = 0; i < this.maxEnergy; i++) {
      const orb = document.createElement('div');
      orb.className = 'energy-orb' + (i >= this.currentEnergy ? ' empty' : '');
      this.energyDisplay.appendChild(orb);
    }
  }

  setEnergy(energy: number): void {
    this.currentEnergy = Math.max(0, Math.min(this.maxEnergy, energy));
    this.renderEnergy();
  }

  getEnergy(): number {
    return this.currentEnergy;
  }

  consumeEnergy(): boolean {
    if (this.currentEnergy > 0) {
      this.currentEnergy--;
      this.renderEnergy();
      return true;
    }
    return false;
  }

  addEnergy(): void {
    if (this.currentEnergy < this.maxEnergy) {
      this.currentEnergy++;
      this.renderEnergy();
    }
  }

  setGoals(goals: Goal[]): void {
    this.goals = goals;
    this.renderGoals();
  }

  renderGoals(): void {
    this.goalsList.innerHTML = '';
    for (const goal of this.goals) {
      const item = document.createElement('div');
      item.className = 'goal-item';

      const check = document.createElement('div');
      check.className = 'goal-check' + (goal.completed ? ' completed' : '');

      const text = document.createElement('div');
      text.className = 'goal-text' + (goal.completed ? ' completed' : '');
      text.textContent = goal.description;

      item.appendChild(check);
      item.appendChild(text);
      this.goalsList.appendChild(item);
    }
  }

  checkGoals(): Goal[] {
    for (const goal of this.goals) {
      if (!goal.completed && goal.check()) {
        goal.completed = true;
      }
    }
    this.renderGoals();
    return this.goals;
  }

  allGoalsCompleted(): boolean {
    return this.goals.every(g => g.completed);
  }

  addMarker(time: number, index: number): void {
    this.markerTimes.push(time);
    this.renderMarkers();
  }

  renderMarkers(): void {
    this.markersList.innerHTML = '';

    if (this.markerTimes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'hint-text';
      empty.textContent = '暂无标记，点击物体选择"记录当前状态"';
      this.markersList.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.markerTimes.length; i++) {
      const btn = document.createElement('button');
      btn.className = 'marker-btn';
      const t = this.markerTimes[i];
      const minutes = Math.floor(t / 60);
      const seconds = Math.floor(t % 60);
      btn.textContent = `标记 ${i + 1} - ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      btn.addEventListener('click', () => {
        this.callbacks.onJumpToMarker(i);
      });
      this.markersList.appendChild(btn);
    }
  }

  showContextMenu(
    x: number,
    y: number,
    hasRecordedState: boolean,
    canRecord: boolean,
    onRecord: () => void,
    onRewind: () => void,
    onSignal: () => void
  ): void {
    this.contextMenu.innerHTML = '';
    this.contextMenu.style.display = 'block';

    const menuItems: { label: string; icon: string; action: () => void; disabled?: boolean }[] = [
      {
        label: '记录当前状态',
        icon: '📌',
        action: onRecord,
        disabled: !canRecord
      },
      {
        label: '回溯到该状态',
        icon: '⏪',
        action: onRewind,
        disabled: !hasRecordedState
      },
      {
        label: '发送信号到过去',
        icon: '📡',
        action: onSignal,
        disabled: !hasRecordedState
      }
    ];

    for (const item of menuItems) {
      const div = document.createElement('div');
      div.className = 'menu-item';
      if (item.disabled) {
        (div as any).disabled = true;
        div.style.opacity = '0.4';
        div.style.cursor = 'not-allowed';
      }

      const icon = document.createElement('span');
      icon.className = 'menu-icon';
      icon.textContent = item.icon;

      const label = document.createElement('span');
      label.textContent = item.label;

      div.appendChild(icon);
      div.appendChild(label);

      if (!item.disabled) {
        div.addEventListener('click', () => {
          item.action();
          this.hideContextMenu();
        });
      }

      this.contextMenu.appendChild(div);
    }

    const menuWidth = 180;
    const menuHeight = 140;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + menuWidth > viewportWidth) {
      posX = viewportWidth - menuWidth - 10;
    }
    if (posY + menuHeight > viewportHeight) {
      posY = viewportHeight - menuHeight - 10;
    }

    this.contextMenu.style.left = posX + 'px';
    this.contextMenu.style.top = posY + 'px';
  }

  hideContextMenu(): void {
    this.contextMenu.style.display = 'none';
  }

  showMessage(text: string, type: 'win' | 'lose'): void {
    this.gameMessage.textContent = text;
    this.gameMessage.className = type;
    this.gameMessage.style.display = 'block';
  }

  hideMessage(): void {
    this.gameMessage.style.display = 'none';
  }

  clearMarkers(): void {
    this.markerTimes = [];
    this.renderMarkers();
  }
}
