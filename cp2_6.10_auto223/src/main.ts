/**
 * 入口文件 - 整合所有模块
 * 
 * 模块调用关系：
 * main.ts (初始化入口)
 *   ↓ 创建
 *   DataLayer (数据层) → 存储海洋分层数据，被 OceanScene 查询
 *   ↓ 创建
 *   UI (界面层)      → 接收用户输入，回调 OceanScene
 *   ↓ 创建
 *   OceanScene (场景层) → 调用 DataLayer 获取数据，渲染 Three.js 场景
 *                        → 回调 UI 更新数据显示
 * 
 * 数据流向：
 * 用户滑块操作 → UI.onDepthChange → OceanScene.setDepth
 *                                           ↓
 *                                     DataLayer.getDepthData
 *                                           ↓
 *                                     相机动画+数据更新
 *                                           ↓
 *                                     UI.updateDataDisplay
 */

import { DataLayer } from './dataLayer';
import { OceanScene } from './scene';
import { UI } from './ui';

class App {
  private dataLayer: DataLayer;
  private scene: OceanScene;
  private ui: UI;

  constructor() {
    this.dataLayer = new DataLayer();

    this.ui = new UI('controls-container', {
      onDepthChange: (depth: number) => {
        this.scene.setDepth(depth);
      },
    });

    this.scene = new OceanScene('canvas-container', this.dataLayer, {
      onDepthChange: (depth: number) => {
        const data = this.dataLayer.getDepthData(depth);
        this.ui.updateDataDisplay(
          data.depth,
          data.temperature,
          data.lightIntensity,
          data.soundSpeed
        );
      },
      onShowSpeciesTooltip: (info, x, y) => {
        this.ui.showSpeciesTooltip(info, x, y);
      },
      onHideSpeciesTooltip: () => {
        this.ui.hideSpeciesTooltip();
      },
    });

    const initialData = this.dataLayer.getDepthData(0);
    this.ui.updateDataDisplay(
      initialData.depth,
      initialData.temperature,
      initialData.lightIntensity,
      initialData.soundSpeed
    );
  }

  public dispose(): void {
    this.scene.dispose();
    this.ui.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
