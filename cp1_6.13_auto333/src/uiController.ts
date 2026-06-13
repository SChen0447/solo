import { GUI } from 'dat.gui';
import { DimensionMapping } from './pointCloudRenderer';

export interface UIControls {
  mapping: DimensionMapping;
  visibleCategories: Record<string, boolean>;
  distanceThreshold: number;
}

export interface UIChangeEvent {
  type: 'mapping' | 'category' | 'threshold' | 'regenerate';
  controls: UIControls;
}

type UIChangeListener = (event: UIChangeEvent) => void;

const DIMENSION_OPTIONS = [
  { label: '维度 1 (D1)', value: 0 },
  { label: '维度 2 (D2)', value: 1 },
  { label: '维度 3 (D3)', value: 2 },
  { label: '维度 4 (D4)', value: 3 },
  { label: '维度 5 (D5)', value: 4 },
  { label: '维度 6 (D6)', value: 5 }
];

export class UIController {
  private gui: GUI;
  private controls: UIControls;
  private listeners: Set<UIChangeListener> = new Set();
  private categories: string[];
  private mappingFolder!: GUI;
  private filterFolder!: GUI;
  private edgeFolder!: GUI;

  constructor(categories: readonly string[]) {
    this.categories = [...categories];

    const visibleCategories: Record<string, boolean> = {};
    for (const cat of this.categories) {
      visibleCategories[cat] = true;
    }

    this.controls = {
      mapping: {
        x: 0,
        y: 1,
        z: 2,
        color: 3,
        size: 4,
        opacity: 5
      },
      visibleCategories,
      distanceThreshold: 0.45
    };

    this.gui = new GUI({ autoPlace: true, width: 280, closeOnTop: false });

    this.setupFolders();
    this.setupMappingControls();
    this.setupCategoryFilters();
    this.setupEdgeControls();
    this.setupActionButtons();
  }

  private setupFolders(): void {
    this.mappingFolder = this.gui.addFolder('🗺️ 维度映射');
    this.mappingFolder.open();

    this.filterFolder = this.gui.addFolder('🔍 分类筛选');
    this.filterFolder.open();

    this.edgeFolder = this.gui.addFolder('✨ 连接线');
    this.edgeFolder.open();
  }

  private setupMappingControls(): void {
    const optionsMap: Record<string, number> = {};
    for (const opt of DIMENSION_OPTIONS) {
      optionsMap[opt.label] = opt.value;
    }

    this.addDropdown(
      this.mappingFolder,
      this.controls.mapping,
      'x',
      'X轴 位置',
      optionsMap,
      'mapping'
    );

    this.addDropdown(
      this.mappingFolder,
      this.controls.mapping,
      'y',
      'Y轴 位置',
      optionsMap,
      'mapping'
    );

    this.addDropdown(
      this.mappingFolder,
      this.controls.mapping,
      'z',
      'Z轴 位置',
      optionsMap,
      'mapping'
    );

    this.addDropdown(
      this.mappingFolder,
      this.controls.mapping,
      'color',
      '球体颜色',
      optionsMap,
      'mapping'
    );

    this.addDropdown(
      this.mappingFolder,
      this.controls.mapping,
      'size',
      '球体大小',
      optionsMap,
      'mapping'
    );

    this.addDropdown(
      this.mappingFolder,
      this.controls.mapping,
      'opacity',
      '球体透明度',
      optionsMap,
      'mapping'
    );
  }

  private addDropdown(
    folder: GUI,
    target: Record<string, number>,
    key: string,
    name: string,
    options: Record<string, number>,
    eventType: 'mapping'
  ): void {
    folder.add(target, key, options)
      .name(name)
      .onFinishChange(() => {
        this.emitChange({ type: eventType, controls: this.getControls() });
      });
  }

  private setupCategoryFilters(): void {
    for (const cat of this.categories) {
      this.filterFolder
        .add(this.controls.visibleCategories, cat)
        .name(cat)
        .onChange(() => {
          this.emitChange({ type: 'category', controls: this.getControls() });
        });
    }
  }

  private setupEdgeControls(): void {
    this.edgeFolder
      .add(this.controls, 'distanceThreshold', 0.1, 1.0, 0.01)
      .name('距离阈值')
      .onFinishChange(() => {
        this.emitChange({ type: 'threshold', controls: this.getControls() });
      });
  }

  private setupActionButtons(): void {
    const actionObj = {
      regenerateData: () => {
        this.emitChange({ type: 'regenerate', controls: this.getControls() });
      },
      resetMapping: () => {
        this.controls.mapping = { x: 0, y: 1, z: 2, color: 3, size: 4, opacity: 5 };
        for (const cat of this.categories) {
          this.controls.visibleCategories[cat] = true;
        }
        this.controls.distanceThreshold = 0.45;
        this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
        this.emitChange({ type: 'mapping', controls: this.getControls() });
        this.emitChange({ type: 'category', controls: this.getControls() });
        this.emitChange({ type: 'threshold', controls: this.getControls() });
      }
    };

    const actionFolder = this.gui.addFolder('⚙️ 操作');
    actionFolder
      .add(actionObj, 'regenerateData')
      .name('🔄 重新生成数据');
    actionFolder
      .add(actionObj, 'resetMapping')
      .name('↺ 重置所有配置');
  }

  onChange(listener: UIChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitChange(event: UIChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getControls(): UIControls {
    return JSON.parse(JSON.stringify(this.controls));
  }

  getVisibleCategories(): Set<string> {
    const result = new Set<string>();
    for (const cat of this.categories) {
      if (this.controls.visibleCategories[cat]) {
        result.add(cat);
      }
    }
    return result;
  }

  dispose(): void {
    this.gui.destroy();
    this.listeners.clear();
  }
}
