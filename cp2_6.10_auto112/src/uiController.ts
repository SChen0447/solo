import { debounce } from 'lodash';
import type { GridConfig, GridItem } from './gridEngine';
import { PRESET_LAYOUTS } from './gridEngine';
import { playClick, playPop } from './soundManager';

export interface UIControllerCallbacks {
  onConfigChange: (config: GridConfig) => void;
  onAddItem: () => void;
  onItemUpdate: (itemId: string, updates: Partial<GridItem>) => void;
  onPresetSelect: (presetKey: string) => void;
  onViewportChange: (width: number) => void;
  onBreakpointSelect: (breakpoint: number) => void;
}

export const BREAKPOINTS = [
  { name: '手机', width: 640 },
  { name: '平板', width: 1024 },
  { name: '桌面', width: 1440 },
];

const DEFAULT_CONFIG: GridConfig = {
  columns: 3,
  rows: 3,
  columnWidths: ['1fr', '1fr', '1fr'],
  rowHeights: ['auto', 'auto', 'auto'],
  gap: 0,
  templateAreas: '',
};

const ALIGN_OPTIONS: Array<'start' | 'center' | 'end' | 'stretch'> = ['start', 'center', 'end', 'stretch'];

export class UIController {
  private container: HTMLElement;
  private callbacks: UIControllerCallbacks;
  private config: GridConfig = { ...DEFAULT_CONFIG };
  private selectedItem: GridItem | null = null;
  private currentViewport: number = 1200;
  private currentBreakpoint: number | null = null;
  private panelCollapsed: boolean = false;
  private debouncedTemplateChange: (value: string) => void;

  constructor(container: HTMLElement, callbacks: UIControllerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.debouncedTemplateChange = debounce((value: string) => {
      this.config.templateAreas = value;
      this.callbacks.onConfigChange({ ...this.config });
    }, 300);
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'ui-container';

    this.renderLayoutWrapper();
  }

  private renderLayoutWrapper(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'app-layout';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.height = '100vh';
    wrapper.style.width = '100%';
    wrapper.style.overflow = 'hidden';

    const leftSection = this.createLeftSection();
    const rightPanel = this.createRightPanel();

    wrapper.appendChild(leftSection);
    wrapper.appendChild(rightPanel);

    const bottomToolbar = this.createBottomToolbar();
    this.container.appendChild(wrapper);
    this.container.appendChild(bottomToolbar);

    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private createLeftSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'left-section';
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.flex = '3';
    section.style.backgroundColor = '#1A1A2E';
    section.style.padding = '20px';
    section.style.alignItems = 'center';
    section.style.justifyContent = 'center';
    section.style.position = 'relative';
    section.style.overflow = 'auto';

    const header = document.createElement('h1');
    header.textContent = 'Grid Layout Sandbox';
    header.style.color = '#E0E0E0';
    header.style.fontSize = '24px';
    header.style.marginBottom = '20px';
    header.style.fontFamily = 'system-ui, sans-serif';
    section.appendChild(header);

    const addBtnWrapper = document.createElement('div');
    addBtnWrapper.style.marginBottom = '20px';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ 添加子项';
    addBtn.style.background = 'linear-gradient(135deg, #E94560 0%, #533483 100%)';
    addBtn.style.color = '#fff';
    addBtn.style.border = 'none';
    addBtn.style.padding = '12px 28px';
    addBtn.style.borderRadius = '8px';
    addBtn.style.fontSize = '15px';
    addBtn.style.fontWeight = '600';
    addBtn.style.cursor = 'pointer';
    addBtn.style.transition = 'all 0.2s ease-in-out';
    addBtn.style.boxShadow = '0 4px 12px rgba(233, 69, 96, 0.3)';
    addBtn.style.fontFamily = 'system-ui, sans-serif';

    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.filter = 'brightness(1.1)';
      addBtn.style.transform = 'scale(1.05)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.filter = 'brightness(1)';
      addBtn.style.transform = 'scale(1)';
    });
    addBtn.addEventListener('click', () => {
      playPop();
      this.callbacks.onAddItem();
    });

    addBtnWrapper.appendChild(addBtn);
    section.appendChild(addBtnWrapper);

    const gridWrapper = document.createElement('div');
    gridWrapper.id = 'grid-wrapper';
    gridWrapper.style.display = 'flex';
    gridWrapper.style.alignItems = 'center';
    gridWrapper.style.justifyContent = 'center';
    gridWrapper.style.flex = '1';
    gridWrapper.style.width = '100%';
    gridWrapper.style.minHeight = '450px';
    section.appendChild(gridWrapper);

    return section;
  }

  private createRightPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'right-panel';
    panel.className = 'right-panel';
    panel.style.flex = '2';
    panel.style.backgroundColor = '#16213E';
    panel.style.padding = '20px';
    panel.style.overflowY = 'auto';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '12px';
    panel.style.transition = 'all 0.3s ease-in-out';
    panel.style.borderLeft = '1px solid #2D3436';

    const panelHeader = document.createElement('div');
    panelHeader.style.display = 'flex';
    panelHeader.style.alignItems = 'center';
    panelHeader.style.justifyContent = 'space-between';
    panelHeader.style.marginBottom = '8px';

    const panelTitle = document.createElement('h2');
    panelTitle.textContent = '控制面板';
    panelTitle.style.color = '#E0E0E0';
    panelTitle.style.fontSize = '18px';
    panelTitle.style.margin = '0';
    panelTitle.style.fontFamily = 'system-ui, sans-serif';
    panelHeader.appendChild(panelTitle);

    const menuBtn = document.createElement('button');
    menuBtn.id = 'menu-btn';
    menuBtn.innerHTML = '☰';
    menuBtn.style.display = 'none';
    menuBtn.style.background = 'transparent';
    menuBtn.style.border = 'none';
    menuBtn.style.color = '#E0E0E0';
    menuBtn.style.fontSize = '24px';
    menuBtn.style.cursor = 'pointer';
    menuBtn.addEventListener('click', () => {
      playClick();
      this.togglePanel();
    });
    panelHeader.appendChild(menuBtn);

    panel.appendChild(panelHeader);

    panel.appendChild(this.createGridConfigCard());
    panel.appendChild(this.createItemEditCard());
    panel.appendChild(this.createPresetCard());

    return panel;
  }

  private togglePanel(): void {
    this.panelCollapsed = !this.panelCollapsed;
    const panel = document.getElementById('right-panel');
    if (panel) {
      if (this.panelCollapsed) {
        panel.style.transform = 'translateY(100%)';
      } else {
        panel.style.transform = 'translateY(0)';
      }
    }
  }

  private checkResponsive(): void {
    const panel = document.getElementById('right-panel');
    const menuBtn = document.getElementById('menu-btn');
    const leftSection = document.querySelector('.left-section') as HTMLElement;

    if (window.innerWidth <= 1280) {
      if (menuBtn) menuBtn.style.display = 'block';
      if (panel) {
        panel.style.position = 'fixed';
        panel.style.bottom = '0';
        panel.style.left = '0';
        panel.style.right = '0';
        panel.style.top = 'auto';
        panel.style.height = '50vh';
        panel.style.zIndex = '1000';
        panel.style.borderLeft = 'none';
        panel.style.borderTop = '1px solid #2D3436';
        panel.style.transform = this.panelCollapsed ? 'translateY(100%)' : 'translateY(0)';
      }
      if (leftSection) {
        leftSection.style.flex = '1';
      }
    } else {
      if (menuBtn) menuBtn.style.display = 'none';
      if (panel) {
        panel.style.position = 'relative';
        panel.style.height = 'auto';
        panel.style.transform = 'translateY(0)';
        panel.style.borderLeft = '1px solid #2D3436';
        panel.style.borderTop = 'none';
      }
      if (leftSection) {
        leftSection.style.flex = '3';
      }
    }
  }

  private createCard(title: string): HTMLElement {
    const card = document.createElement('div');
    card.style.backgroundColor = '#2D3436';
    card.style.borderRadius = '8px';
    card.style.padding = '16px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '12px';

    const cardTitle = document.createElement('h3');
    cardTitle.textContent = title;
    cardTitle.style.color = '#E0E0E0';
    cardTitle.style.fontSize = '14px';
    cardTitle.style.fontWeight = '600';
    cardTitle.style.margin = '0 0 4px 0';
    cardTitle.style.fontFamily = 'system-ui, sans-serif';
    card.appendChild(cardTitle);

    return card;
  }

  private createGridConfigCard(): HTMLElement {
    const card = this.createCard('网格容器配置');

    card.appendChild(this.createSliderControl('列数', this.config.columns, 2, 6, 1, (val) => {
      this.config.columns = val;
      while (this.config.columnWidths.length < val) {
        this.config.columnWidths.push('1fr');
      }
      this.config.columnWidths = this.config.columnWidths.slice(0, val);
      this.callbacks.onConfigChange({ ...this.config });
    }));

    card.appendChild(this.createSliderControl('行数', this.config.rows, 2, 5, 1, (val) => {
      this.config.rows = val;
      while (this.config.rowHeights.length < val) {
        this.config.rowHeights.push('auto');
      }
      this.config.rowHeights = this.config.rowHeights.slice(0, val);
      this.callbacks.onConfigChange({ ...this.config });
    }));

    card.appendChild(this.createSliderControl('间隙', this.config.gap, 0, 20, 1, (val) => {
      this.config.gap = val;
      this.callbacks.onConfigChange({ ...this.config });
    }));

    card.appendChild(this.createWidthsControl());
    card.appendChild(this.createHeightsControl());

    return card;
  }

  private createSliderControl(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (val: number) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';

    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.alignItems = 'center';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.color = '#E0E0E0';
    labelEl.style.fontSize = '13px';
    labelEl.style.fontFamily = 'system-ui, sans-serif';

    const valueEl = document.createElement('span');
    valueEl.textContent = String(value);
    valueEl.style.color = '#0F3460';
    valueEl.style.fontWeight = '600';
    valueEl.style.fontSize = '13px';

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.width = '100%';
    slider.style.accentColor = '#0F3460';
    slider.style.cursor = 'pointer';

    slider.addEventListener('input', () => {
      const val = Number(slider.value);
      valueEl.textContent = String(val);
      onChange(val);
    });
    slider.addEventListener('change', () => playClick());

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);

    return wrapper;
  }

  private createWidthsControl(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';

    const label = document.createElement('label');
    label.textContent = '列宽设置';
    label.style.color = '#E0E0E0';
    label.style.fontSize = '13px';
    label.style.fontFamily = 'system-ui, sans-serif';
    wrapper.appendChild(label);

    const widthsContainer = document.createElement('div');
    widthsContainer.style.display = 'flex';
    widthsContainer.style.gap = '8px';
    widthsContainer.style.flexWrap = 'wrap';

    const updateWidths = () => {
      widthsContainer.innerHTML = '';
      const options = ['1fr', '2fr', '3fr', '100px', '150px', '200px'];
      for (let i = 0; i < this.config.columns; i++) {
        const select = document.createElement('select');
        select.style.padding = '6px 8px';
        select.style.borderRadius = '4px';
        select.style.border = '1px solid #555';
        select.style.backgroundColor = '#1A1A2E';
        select.style.color = '#E0E0E0';
        select.style.fontSize = '12px';
        select.style.outline = 'none';
        select.style.cursor = 'pointer';
        select.style.minWidth = '70px';

        options.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        });
        select.value = this.config.columnWidths[i] || '1fr';

        select.addEventListener('change', () => {
          playClick();
          this.config.columnWidths[i] = select.value;
          this.callbacks.onConfigChange({ ...this.config });
        });

        widthsContainer.appendChild(select);
      }
    };

    updateWidths();

    const observer = new MutationObserver(() => {});
    observer.observe(widthsContainer, { childList: true });

    this.container.addEventListener('config-updated', () => updateWidths());

    wrapper.appendChild(widthsContainer);
    return wrapper;
  }

  private createHeightsControl(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';

    const label = document.createElement('label');
    label.textContent = '行高设置';
    label.style.color = '#E0E0E0';
    label.style.fontSize = '13px';
    label.style.fontFamily = 'system-ui, sans-serif';
    wrapper.appendChild(label);

    const heightsContainer = document.createElement('div');
    heightsContainer.style.display = 'flex';
    heightsContainer.style.gap = '8px';
    heightsContainer.style.flexWrap = 'wrap';

    const updateHeights = () => {
      heightsContainer.innerHTML = '';
      const options = ['auto', '60px', '80px', '100px', '120px', '150px'];
      for (let i = 0; i < this.config.rows; i++) {
        const select = document.createElement('select');
        select.style.padding = '6px 8px';
        select.style.borderRadius = '4px';
        select.style.border = '1px solid #555';
        select.style.backgroundColor = '#1A1A2E';
        select.style.color = '#E0E0E0';
        select.style.fontSize = '12px';
        select.style.outline = 'none';
        select.style.cursor = 'pointer';
        select.style.minWidth = '70px';

        options.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        });
        select.value = this.config.rowHeights[i] || 'auto';

        select.addEventListener('change', () => {
          playClick();
          this.config.rowHeights[i] = select.value;
          this.callbacks.onConfigChange({ ...this.config });
        });

        heightsContainer.appendChild(select);
      }
    };

    updateHeights();
    this.container.addEventListener('config-updated', () => updateHeights());

    wrapper.appendChild(heightsContainer);
    return wrapper;
  }

  private createItemEditCard(): HTMLElement {
    const card = this.createCard('子项属性编辑');
    card.id = 'item-edit-card';

    this.renderItemEditContent(card);
    return card;
  }

  private renderItemEditContent(card: HTMLElement): void {
    const existingContent = card.querySelectorAll('.edit-content');
    existingContent.forEach((el) => el.remove());

    if (!this.selectedItem) {
      const hint = document.createElement('p');
      hint.className = 'edit-content';
      hint.textContent = '点击网格中的子项进行编辑';
      hint.style.color = '#888';
      hint.style.fontSize = '13px';
      hint.style.margin = '0';
      hint.style.fontStyle = 'italic';
      hint.style.fontFamily = 'system-ui, sans-serif';
      card.appendChild(hint);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'edit-content';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '10px';

    const gridLineOptions = ['auto', '1', '2', '3', '4', '5', '6', 'span 1', 'span 2', 'span 3', 'span 4'];

    wrapper.appendChild(this.createSelectControl(
      'grid-column-start',
      gridLineOptions,
      this.selectedItem.gridColumnStart || 'auto',
      (val) => this.updateSelectedItem({ gridColumnStart: val })
    ));

    wrapper.appendChild(this.createSelectControl(
      'grid-column-end',
      gridLineOptions,
      this.selectedItem.gridColumnEnd || 'auto',
      (val) => this.updateSelectedItem({ gridColumnEnd: val })
    ));

    wrapper.appendChild(this.createSelectControl(
      'grid-row-start',
      gridLineOptions,
      this.selectedItem.gridRowStart || 'auto',
      (val) => this.updateSelectedItem({ gridRowStart: val })
    ));

    wrapper.appendChild(this.createSelectControl(
      'grid-row-end',
      gridLineOptions,
      this.selectedItem.gridRowEnd || 'auto',
      (val) => this.updateSelectedItem({ gridRowEnd: val })
    ));

    wrapper.appendChild(this.createInputControl(
      'grid-area 名称',
      this.selectedItem.areaName || '',
      (val) => this.updateSelectedItem({ areaName: val })
    ));

    wrapper.appendChild(this.createSelectControl(
      'justify-self',
      ALIGN_OPTIONS,
      this.selectedItem.justifySelf || 'stretch',
      (val) => this.updateSelectedItem({ justifySelf: val as GridItem['justifySelf'] })
    ));

    wrapper.appendChild(this.createSelectControl(
      'align-self',
      ALIGN_OPTIONS,
      this.selectedItem.alignSelf || 'stretch',
      (val) => this.updateSelectedItem({ alignSelf: val as GridItem['alignSelf'] })
    ));

    card.appendChild(wrapper);
  }

  private createSelectControl(
    label: string,
    options: string[],
    value: string,
    onChange: (val: string) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '4px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.color = '#E0E0E0';
    labelEl.style.fontSize = '12px';
    labelEl.style.fontFamily = 'system-ui, sans-serif';

    const select = document.createElement('select');
    select.style.padding = '6px 8px';
    select.style.borderRadius = '4px';
    select.style.border = '1px solid #555';
    select.style.backgroundColor = '#1A1A2E';
    select.style.color = '#E0E0E0';
    select.style.fontSize = '12px';
    select.style.outline = 'none';
    select.style.cursor = 'pointer';

    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
    select.value = value;

    select.addEventListener('change', () => {
      playClick();
      onChange(select.value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);
    return wrapper;
  }

  private createInputControl(
    label: string,
    value: string,
    onChange: (val: string) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '4px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.color = '#E0E0E0';
    labelEl.style.fontSize = '12px';
    labelEl.style.fontFamily = 'system-ui, sans-serif';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = '输入区域名称...';
    input.style.padding = '6px 8px';
    input.style.borderRadius = '4px';
    input.style.border = '1px solid #555';
    input.style.backgroundColor = '#1A1A2E';
    input.style.color = '#E0E0E0';
    input.style.fontSize = '12px';
    input.style.outline = 'none';

    input.addEventListener('input', () => onChange(input.value));
    input.addEventListener('change', () => playClick());

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  }

  private createPresetCard(): HTMLElement {
    const card = this.createCard('预设布局 & 区域模板');

    const presetBtns = document.createElement('div');
    presetBtns.style.display = 'flex';
    presetBtns.style.flexWrap = 'wrap';
    presetBtns.style.gap = '8px';

    Object.entries(PRESET_LAYOUTS).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.textContent = preset.name;
      btn.style.padding = '8px 14px';
      btn.style.borderRadius = '6px';
      btn.style.border = '1px solid #555';
      btn.style.backgroundColor = '#1A1A2E';
      btn.style.color = '#E0E0E0';
      btn.style.fontSize = '12px';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all 0.2s ease-in-out';
      btn.style.fontFamily = 'system-ui, sans-serif';

      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#0F3460';
        btn.style.borderColor = '#0F3460';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = '#1A1A2E';
        btn.style.borderColor = '#555';
      });
      btn.addEventListener('click', () => {
        playPop();
        this.callbacks.onPresetSelect(key);
      });

      presetBtns.appendChild(btn);
    });
    card.appendChild(presetBtns);

    const templateDisplay = document.createElement('div');
    templateDisplay.id = 'template-display';
    templateDisplay.style.backgroundColor = '#1A1A2E';
    templateDisplay.style.padding = '10px';
    templateDisplay.style.borderRadius = '6px';
    templateDisplay.style.fontFamily = 'monospace';
    templateDisplay.style.fontSize = '12px';
    templateDisplay.style.color = '#4ECDC4';
    templateDisplay.style.whiteSpace = 'pre';
    templateDisplay.style.minHeight = '40px';
    templateDisplay.style.border = '1px solid #555';
    templateDisplay.textContent = this.config.templateAreas || '(无区域模板)';
    card.appendChild(templateDisplay);

    const templateLabel = document.createElement('label');
    templateLabel.textContent = '编辑 grid-template-areas';
    templateLabel.style.color = '#E0E0E0';
    templateLabel.style.fontSize = '12px';
    templateLabel.style.fontFamily = 'system-ui, sans-serif';
    card.appendChild(templateLabel);

    const textarea = document.createElement('textarea');
    textarea.value = this.config.templateAreas;
    textarea.placeholder = '如:\nheader header header\nsidebar main .\nfooter footer footer';
    textarea.rows = 5;
    textarea.style.padding = '8px';
    textarea.style.borderRadius = '4px';
    textarea.style.border = '1px solid #555';
    textarea.style.backgroundColor = '#1A1A2E';
    textarea.style.color = '#E0E0E0';
    textarea.style.fontSize = '12px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.outline = 'none';
    textarea.style.resize = 'vertical';
    textarea.style.whiteSpace = 'pre';

    textarea.addEventListener('input', () => {
      this.debouncedTemplateChange(textarea.value);
      templateDisplay.textContent = textarea.value || '(无区域模板)';
    });
    textarea.addEventListener('change', () => playClick());

    card.appendChild(textarea);

    return card;
  }

  private createBottomToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.style.backgroundColor = '#16213E';
    toolbar.style.padding = '12px 20px';
    toolbar.style.borderTop = '1px solid #2D3436';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '20px';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.position = 'relative';
    toolbar.style.zIndex = '100';

    const viewportInfo = document.createElement('div');
    viewportInfo.style.display = 'flex';
    viewportInfo.style.alignItems = 'center';
    viewportInfo.style.gap = '12px';

    const viewportLabel = document.createElement('span');
    viewportLabel.textContent = '视口宽度:';
    viewportLabel.style.color = '#E0E0E0';
    viewportLabel.style.fontSize = '13px';
    viewportLabel.style.fontFamily = 'system-ui, sans-serif';

    const viewportValue = document.createElement('span');
    viewportValue.id = 'viewport-value';
    viewportValue.textContent = `${this.currentViewport}px`;
    viewportValue.style.color = '#4ECDC4';
    viewportValue.style.fontWeight = '600';
    viewportValue.style.fontSize = '13px';
    viewportValue.style.minWidth = '60px';
    viewportValue.style.fontFamily = 'monospace';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '320';
    slider.max = '1920';
    slider.step = '10';
    slider.value = String(this.currentViewport);
    slider.style.width = '200px';
    slider.style.accentColor = '#0F3460';
    slider.style.cursor = 'pointer';

    slider.addEventListener('input', () => {
      const val = Number(slider.value);
      this.currentViewport = val;
      viewportValue.textContent = `${val}px`;
      this.callbacks.onViewportChange(val);
      this.updateBreakpointHighlight();
    });
    slider.addEventListener('change', () => playClick());

    viewportInfo.appendChild(viewportLabel);
    viewportInfo.appendChild(viewportValue);
    viewportInfo.appendChild(slider);
    toolbar.appendChild(viewportInfo);

    const breakpointBtns = document.createElement('div');
    breakpointBtns.style.display = 'flex';
    breakpointBtns.style.gap = '8px';
    breakpointBtns.style.marginLeft = 'auto';

    BREAKPOINTS.forEach((bp) => {
      const btn = document.createElement('button');
      btn.className = 'breakpoint-btn';
      btn.dataset.width = String(bp.width);
      btn.textContent = `${bp.name} ${bp.width}px`;
      btn.style.padding = '8px 16px';
      btn.style.borderRadius = '6px';
      btn.style.border = '1px solid #555';
      btn.style.backgroundColor = '#1A1A2E';
      btn.style.color = '#E0E0E0';
      btn.style.fontSize = '12px';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all 0.2s ease-in-out';
      btn.style.fontFamily = 'system-ui, sans-serif';

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.active !== 'true') {
          btn.style.backgroundColor = '#2D3436';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.active !== 'true') {
          btn.style.backgroundColor = '#1A1A2E';
        }
      });
      btn.addEventListener('click', () => {
        playClick();
        this.currentBreakpoint = bp.width;
        this.currentViewport = bp.width;
        slider.value = String(bp.width);
        viewportValue.textContent = `${bp.width}px`;
        this.callbacks.onBreakpointSelect(bp.width);
        this.callbacks.onViewportChange(bp.width);
        this.updateBreakpointHighlight();
      });

      breakpointBtns.appendChild(btn);
    });

    toolbar.appendChild(breakpointBtns);
    return toolbar;
  }

  private updateBreakpointHighlight(): void {
    const btns = document.querySelectorAll('.breakpoint-btn');
    btns.forEach((btn) => {
      const width = Number((btn as HTMLElement).dataset.width);
      const isActive = width === this.currentBreakpoint ||
        (this.currentBreakpoint === null &&
          Math.abs(width - this.currentViewport) < 20);

      if (isActive) {
        (btn as HTMLElement).style.backgroundColor = '#0F3460';
        (btn as HTMLElement).style.borderColor = '#0F3460';
        (btn as HTMLElement).style.color = '#fff';
        (btn as HTMLElement).dataset.active = 'true';
      } else {
        (btn as HTMLElement).style.backgroundColor = '#1A1A2E';
        (btn as HTMLElement).style.borderColor = '#555';
        (btn as HTMLElement).style.color = '#E0E0E0';
        (btn as HTMLElement).dataset.active = 'false';
      }
    });
  }

  updateConfig(config: GridConfig): void {
    this.config = { ...config };
    const event = new CustomEvent('config-updated', { detail: config });
    this.container.dispatchEvent(event);

    const templateDisplay = document.getElementById('template-display');
    if (templateDisplay) {
      templateDisplay.textContent = config.templateAreas || '(无区域模板)';
    }
  }

  setSelectedItem(item: GridItem | null): void {
    this.selectedItem = item;
    const card = document.getElementById('item-edit-card');
    if (card) {
      this.renderItemEditContent(card);
    }
  }

  updateSelectedItem(updates: Partial<GridItem>): void {
    if (!this.selectedItem) return;
    this.callbacks.onItemUpdate(this.selectedItem.id, updates);
  }

  getConfig(): GridConfig {
    return { ...this.config };
  }
}
