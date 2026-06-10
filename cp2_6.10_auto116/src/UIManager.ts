import { BattleReport, Character } from './types';

const LEFT_PANEL_BG = '#2d5016';
const RIGHT_PANEL_BG = '#c3b091';
const RED_TEAM_COLOR = '#e74c3c';
const BLUE_TEAM_COLOR = '#3498db';
const SELECTED_BORDER = '#f1c40f';

interface UIState {
  characters: Character[];
  selectedCharacterId: string | null;
  selectedSkillId: string | null;
  actionOrder: Map<string, number>;
}

export class UIManager {
  private container: HTMLElement;
  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private mapContainer!: HTMLElement;
  private skillListContainer!: HTMLElement;
  private battleReportModal!: HTMLElement;
  private battleReportOverlay!: HTMLElement;
  private modalContent!: HTMLElement;
  private isModalVisible: boolean = false;

  private onSelectCharacterCallback: ((id: string) => void) | null = null;
  private onSelectSkillCallback: ((skillId: string) => void) | null = null;
  private onGenerateBattleReportCallback: (() => void) | null = null;
  private onSetSpeedCallback: ((id: string, speed: number) => void) | null = null;
  private onSetSkillDamageCallback: ((charId: string, skillId: string, damage: number) => void) | null = null;
  private onSetSkillRangeCallback: ((charId: string, skillId: string, range: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildLayout();
    this.bindResponsive();
  }

  public getMapContainer(): HTMLElement {
    return this.mapContainer;
  }

  public setOnSelectCharacter(callback: (id: string) => void): void {
    this.onSelectCharacterCallback = callback;
  }

  public setOnSelectSkill(callback: (skillId: string) => void): void {
    this.onSelectSkillCallback = callback;
  }

  public setOnGenerateBattleReport(callback: () => void): void {
    this.onGenerateBattleReportCallback = callback;
  }

  public setOnSetSpeed(callback: (id: string, speed: number) => void): void {
    this.onSetSpeedCallback = callback;
  }

  public setOnSetSkillDamage(callback: (charId: string, skillId: string, damage: number) => void): void {
    this.onSetSkillDamageCallback = callback;
  }

  public setOnSetSkillRange(callback: (charId: string, skillId: string, range: number) => void): void {
    this.onSetSkillRangeCallback = callback;
  }

  private buildLayout(): void {
    this.container.style.cssText = `
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex-direction: row;
      background: #1a1a1a;
    `;

    this.leftPanel = this.createLeftPanel();
    this.mapContainer = this.createMapContainer();
    this.rightPanel = this.createRightPanel();

    this.container.appendChild(this.leftPanel);
    this.container.appendChild(this.mapContainer);
    this.container.appendChild(this.rightPanel);

    this.buildBattleReportModal();
  }

  private createLeftPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 260px;
      flex-shrink: 0;
      background: ${LEFT_PANEL_BG};
      color: #f5f5dc;
      padding: 16px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const title = document.createElement('h2');
    title.textContent = '队伍控制面板';
    title.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #fff8dc;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;
    panel.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = '点击角色或调整属性';
    subtitle.style.cssText = `
      font-size: 12px;
      color: #d4c896;
      margin-bottom: 12px;
    `;
    panel.appendChild(subtitle);

    const teamContainer = document.createElement('div');
    teamContainer.id = 'team-container';
    teamContainer.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    panel.appendChild(teamContainer);

    return panel;
  }

  private createMapContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5dc;
      padding: 20px;
      min-width: 0;
      min-height: 0;
      position: relative;
    `;
    return container;
  }

  private createRightPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 300px;
      flex-shrink: 0;
      background: ${RIGHT_PANEL_BG};
      padding: 16px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const title = document.createElement('h2');
    title.textContent = '角色信息';
    title.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #3d2b1f;
      margin-bottom: 4px;
    `;
    panel.appendChild(title);

    const infoArea = document.createElement('div');
    infoArea.id = 'character-info';
    infoArea.style.cssText = `
      background: rgba(255,255,255,0.4);
      border-radius: 8px;
      padding: 12px;
      min-height: 120px;
    `;
    infoArea.innerHTML = '<p style="color:#6b5344;font-size:13px;">请从左侧或地图上选择一个角色查看详情</p>';
    panel.appendChild(infoArea);

    const skillsTitle = document.createElement('h3');
    skillsTitle.textContent = '技能列表';
    skillsTitle.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      color: #3d2b1f;
      margin-top: 8px;
    `;
    panel.appendChild(skillsTitle);

    this.skillListContainer = document.createElement('div');
    this.skillListContainer.id = 'skill-list';
    this.skillListContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    panel.appendChild(this.skillListContainer);

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    panel.appendChild(spacer);

    const reportBtn = document.createElement('button');
    reportBtn.textContent = '生成战报';
    reportBtn.style.cssText = `
      padding: 12px 16px;
      font-size: 15px;
      font-weight: bold;
      background: #4a6741;
      color: #fff8dc;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    reportBtn.addEventListener('mouseenter', () => {
      reportBtn.style.background = '#5d7f52';
      reportBtn.style.transform = 'scale(1.05)';
    });
    reportBtn.addEventListener('mouseleave', () => {
      reportBtn.style.background = '#4a6741';
      reportBtn.style.transform = 'scale(1)';
    });
    reportBtn.addEventListener('click', () => {
      if (this.onGenerateBattleReportCallback) {
        this.onGenerateBattleReportCallback();
      }
    });
    panel.appendChild(reportBtn);

    return panel;
  }

  private buildBattleReportModal(): void {
    this.battleReportOverlay = document.createElement('div');
    this.battleReportOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    this.battleReportOverlay.addEventListener('click', (e) => {
      if (e.target === this.battleReportOverlay) {
        this.hideBattleReport();
      }
    });

    this.modalContent = document.createElement('div');
    this.modalContent.style.cssText = `
      width: 400px;
      height: 300px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      padding: 20px;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #ddd;
    `;

    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalTitle.textContent = '战斗报告';
    modalTitle.style.cssText = `
      font-size: 20px;
      color: #2d5016;
      font-weight: bold;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = '#eee';
      closeBtn.style.color = '#333';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none';
      closeBtn.style.color = '#999';
    });
    closeBtn.addEventListener('click', () => this.hideBattleReport());

    header.appendChild(modalTitle);
    header.appendChild(closeBtn);
    this.modalContent.appendChild(header);

    const reportBody = document.createElement('div');
    reportBody.id = 'report-body';
    reportBody.style.cssText = `
      flex: 1;
      overflow-y: auto;
      font-size: 14px;
    `;
    this.modalContent.appendChild(reportBody);

    this.battleReportOverlay.appendChild(this.modalContent);
    this.container.appendChild(this.battleReportOverlay);
  }

  public showBattleReport(report: BattleReport): void {
    const body = document.getElementById('report-body');
    if (!body) return;

    const items = report.entries
      .map((entry) => {
        const teamColor = entry.team === 'red' ? RED_TEAM_COLOR : BLUE_TEAM_COLOR;
        return `
          <div style="display:flex;align-items:center;padding:10px;margin-bottom:6px;background:#f9f9f9;border-radius:8px;border-left:4px solid ${teamColor};">
            <span style="width:28px;height:28px;background:${teamColor};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;margin-right:12px;flex-shrink:0;">${entry.order}</span>
            <div style="flex:1;">
              <div style="font-weight:bold;color:#333;">${entry.characterName}</div>
              <div style="font-size:12px;color:#666;">技能: ${entry.skillName} · 覆盖格数: ${entry.coveredTiles}</div>
            </div>
          </div>
        `;
      })
      .join('');

    body.innerHTML = items;

    this.battleReportOverlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.battleReportOverlay.style.opacity = '1';
      this.modalContent.style.transform = 'translateY(0)';
    });
    this.isModalVisible = true;
  }

  public hideBattleReport(): void {
    if (!this.isModalVisible) return;
    this.battleReportOverlay.style.opacity = '0';
    this.modalContent.style.transform = 'translateY(100%)';
    setTimeout(() => {
      this.battleReportOverlay.style.display = 'none';
    }, 300);
    this.isModalVisible = false;
  }

  private bindResponsive(): void {
    const applyLayout = () => {
      const width = window.innerWidth;
      if (width < 900) {
        this.container.style.flexDirection = 'column';
        this.leftPanel.style.width = '100%';
        this.leftPanel.style.maxHeight = '180px';
        this.rightPanel.style.width = '100%';
        this.rightPanel.style.maxHeight = '280px';
        this.mapContainer.style.width = '100%';
        this.mapContainer.style.height = '600px';
        this.mapContainer.style.maxHeight = '600px';
      } else {
        this.container.style.flexDirection = 'row';
        this.leftPanel.style.width = '260px';
        this.leftPanel.style.maxHeight = 'none';
        this.rightPanel.style.width = '300px';
        this.rightPanel.style.maxHeight = 'none';
        this.mapContainer.style.height = 'auto';
        this.mapContainer.style.maxHeight = 'none';
      }
    };
    applyLayout();
    window.addEventListener('resize', applyLayout);
  }

  public update(state: UIState): void {
    this.renderTeamList(state);
    this.renderCharacterInfo(state);
    this.renderSkillList(state);
  }

  private renderTeamList(state: UIState): void {
    const container = document.getElementById('team-container');
    if (!container) return;

    const redTeam = state.characters.filter((c) => c.team === 'red');
    const blueTeam = state.characters.filter((c) => c.team === 'blue');

    container.innerHTML = '';
    container.appendChild(this.renderTeamSection('红方', RED_TEAM_COLOR, redTeam, state));
    container.appendChild(this.renderTeamSection('蓝方', BLUE_TEAM_COLOR, blueTeam, state));
  }

  private renderTeamSection(
    teamName: string,
    color: string,
    members: Character[],
    state: UIState
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const label = document.createElement('div');
    label.textContent = teamName;
    label.style.cssText = `
      font-size: 13px;
      font-weight: bold;
      color: ${color};
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    `;
    section.appendChild(label);

    members.forEach((char) => {
      const order = state.actionOrder.get(char.id) || '-';
      const isSelected = char.id === state.selectedCharacterId;
      const card = document.createElement('div');
      card.style.cssText = `
        display: flex;
        align-items: center;
        padding: 10px;
        background: ${isSelected ? 'rgba(241, 196, 15, 0.25)' : 'rgba(255,255,255,0.1)'};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: ${isSelected ? `2px solid ${SELECTED_BORDER}` : '2px solid transparent'};
      `;
      card.addEventListener('mouseenter', () => {
        if (!isSelected) card.style.background = 'rgba(255,255,255,0.2)';
        card.style.transform = 'scale(1.02)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.background = isSelected ? 'rgba(241, 196, 15, 0.25)' : 'rgba(255,255,255,0.1)';
        card.style.transform = 'scale(1)';
      });
      card.addEventListener('click', () => {
        if (this.onSelectCharacterCallback) {
          this.onSelectCharacterCallback(char.id);
        }
      });

      card.innerHTML = `
        <div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:22px;margin-right:10px;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
          ${char.avatar}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:14px;color:#fff8dc;">${char.name}</div>
          <div style="font-size:11px;color:#d4c896;">速度: ${char.speed}</div>
        </div>
        <div style="width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:#fff;flex-shrink:0;">
          ${order}
        </div>
      `;
      section.appendChild(card);

      if (isSelected) {
        const speedControl = document.createElement('div');
        speedControl.style.cssText = `
          margin-top: 6px;
          padding: 8px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          animation: fadeIn 0.2s ease;
        `;
        speedControl.innerHTML = `
          <div style="font-size:11px;color:#d4c896;margin-bottom:4px;">调整速度 (${char.speed})</div>
          <input type="range" min="1" max="100" value="${char.speed}" id="speed-${char.id}" style="width:100%;"/>
        `;
        section.appendChild(speedControl);
        setTimeout(() => {
          const input = document.getElementById(`speed-${char.id}`) as HTMLInputElement;
          if (input) {
            input.addEventListener('input', (e) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (this.onSetSpeedCallback) {
                this.onSetSpeedCallback(char.id, val);
              }
            });
          }
        }, 0);
      }
    });

    return section;
  }

  private renderCharacterInfo(state: UIState): void {
    const infoArea = document.getElementById('character-info');
    if (!infoArea) return;

    const selectedChar = state.characters.find((c) => c.id === state.selectedCharacterId);
    if (!selectedChar) {
      infoArea.innerHTML = '<p style="color:#6b5344;font-size:13px;">请从左侧或地图上选择一个角色查看详情</p>';
      return;
    }

    const order = state.actionOrder.get(selectedChar.id) || '-';
    const teamColor = selectedChar.team === 'red' ? RED_TEAM_COLOR : BLUE_TEAM_COLOR;

    infoArea.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:56px;height:56px;border-radius:50%;background:${teamColor};display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:3px solid ${SELECTED_BORDER};">
          ${selectedChar.avatar}
        </div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:bold;color:#3d2b1f;">${selectedChar.name}</div>
          <div style="font-size:13px;color:#6b5344;margin-top:2px;">队伍: ${selectedChar.team === 'red' ? '红方' : '蓝方'}</div>
          <div style="font-size:13px;color:#6b5344;">行动顺序: <span style="font-weight:bold;color:${teamColor};">第 ${order} 位</span></div>
        </div>
      </div>
    `;
  }

  private renderSkillList(state: UIState): void {
    if (!this.skillListContainer) return;

    const selectedChar = state.characters.find((c) => c.id === state.selectedCharacterId);
    if (!selectedChar) {
      this.skillListContainer.innerHTML = '<p style="color:#6b5344;font-size:13px;">选择角色后可查看技能</p>';
      return;
    }

    this.skillListContainer.innerHTML = '';
    selectedChar.skills.forEach((skill, idx) => {
      const isSelected = skill.id === state.selectedSkillId;
      const tab = document.createElement('div');
      tab.style.cssText = `
        padding: 10px 12px;
        background: ${isSelected ? '#4a6741' : 'rgba(255,255,255,0.6)'};
        color: ${isSelected ? '#fff8dc' : '#3d2b1f'};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        animation: fadeIn 0.2s ease ${idx * 0.05}s both;
      `;
      tab.addEventListener('mouseenter', () => {
        if (!isSelected) {
          tab.style.background = 'rgba(255,255,255,0.9)';
          tab.style.transform = 'scale(1.02)';
        }
      });
      tab.addEventListener('mouseleave', () => {
        tab.style.background = isSelected ? '#4a6741' : 'rgba(255,255,255,0.6)';
        tab.style.transform = 'scale(1)';
      });
      tab.addEventListener('click', () => {
        if (this.onSelectSkillCallback) {
          this.onSelectSkillCallback(isSelected ? '' : skill.id);
        }
      });

      tab.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:bold;">${skill.name}</span>
          <span style="font-size:11px;padding:2px 6px;background:${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(74,103,65,0.2)'};border-radius:4px;">伤害 ${skill.damage}</span>
        </div>
        <div style="font-size:11px;opacity:${isSelected ? '0.9' : '0.8'};">${skill.description}</div>
        <div style="font-size:11px;opacity:${isSelected ? '0.9' : '0.7'};margin-top:6px;">射程: ${skill.range}${skill.aoeRadius ? ` · 范围半径: ${skill.aoeRadius}` : ''}</div>
      `;

      this.skillListContainer.appendChild(tab);

      if (isSelected) {
        const controls = document.createElement('div');
        controls.style.cssText = `
          padding: 10px;
          background: rgba(74,103,65,0.15);
          border-radius: 6px;
          margin-top: -4px;
          animation: fadeIn 0.2s ease;
        `;
        controls.innerHTML = `
          <div style="font-size:11px;color:#3d2b1f;margin-bottom:4px;">伤害: ${skill.damage}</div>
          <input type="range" min="1" max="100" value="${skill.damage}" id="dmg-${selectedChar.id}-${skill.id}" style="width:100%;margin-bottom:8px;"/>
          <div style="font-size:11px;color:#3d2b1f;margin-bottom:4px;">射程: ${skill.range}</div>
          <input type="range" min="1" max="8" value="${skill.range}" id="rng-${selectedChar.id}-${skill.id}" style="width:100%;"/>
        `;
        this.skillListContainer.appendChild(controls);
        setTimeout(() => {
          const dmgInput = document.getElementById(`dmg-${selectedChar.id}-${skill.id}`) as HTMLInputElement;
          const rngInput = document.getElementById(`rng-${selectedChar.id}-${skill.id}`) as HTMLInputElement;
          if (dmgInput) {
            dmgInput.addEventListener('input', (e) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (this.onSetSkillDamageCallback) {
                this.onSetSkillDamageCallback(selectedChar.id, skill.id, val);
              }
            });
          }
          if (rngInput) {
            rngInput.addEventListener('input', (e) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (this.onSetSkillRangeCallback) {
                this.onSetSkillRangeCallback(selectedChar.id, skill.id, val);
              }
            });
          }
        }, 0);
      }
    });
  }
}
