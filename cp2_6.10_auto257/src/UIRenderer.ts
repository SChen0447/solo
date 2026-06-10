import { v4 as uuidv4 } from 'uuid';
import {
  Tile, Piece, PieceStats, TileVisitInfo, Snapshot, PRESET_COLORS, PIECE_COLORS,
  PassType, Direction, HighlightPath
} from './types';
import { TileMapEditor } from './TileMapEditor';
import { PathSimulator } from './PathSimulator';

export class UIRenderer {
  private container: HTMLElement;
  private tileMapEditor: TileMapEditor;
  private pathSimulator: PathSimulator;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;

  private leftPanel: HTMLDivElement;
  private rightPanel: HTMLDivElement;
  private centerWrapper: HTMLDivElement;
  private bottomBar: HTMLDivElement;

  private statsContainer: HTMLDivElement;
  private chartContainer: HTMLDivElement;
  private thumbnailContainer: HTMLDivElement;
  private contextMenu: HTMLDivElement;
  private tileInfoCard: HTMLDivElement;

  private selectedColor: string = PRESET_COLORS[0].value;
  private toolMode: 'edit' | 'placePiece' = 'edit';
  private snapshots: Snapshot[] = [];
  private highlightPaths: HighlightPath[] = [];
  private animFrame = 0;
  private rafId: number | null = null;
  private diffTiles: Set<string> = new Set();

  constructor(
    container: HTMLElement,
    tileMapEditor: TileMapEditor,
    pathSimulator: PathSimulator
  ) {
    this.container = container;
    this.tileMapEditor = tileMapEditor;
    this.pathSimulator = pathSimulator;

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d')!;

    this.leftPanel = document.createElement('div');
    this.rightPanel = document.createElement('div');
    this.centerWrapper = document.createElement('div');
    this.bottomBar = document.createElement('div');
    this.statsContainer = document.createElement('div');
    this.chartContainer = document.createElement('div');
    this.thumbnailContainer = document.createElement('div');
    this.contextMenu = document.createElement('div');
    this.tileInfoCard = document.createElement('div');

    this.buildLayout();
    this.bindGlobalEvents();
    this.subscribeData();
    this.startAnimationLoop();
  }

  private buildLayout(): void {
    const style = document.createElement('style');
    style.textContent = `
      .sb-container { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; }
      .sb-main { display: flex; flex: 1; overflow: hidden; padding-top: 50px; }
      .sb-left { width: 200px; background: #2b2b3d; margin: 10px; border-radius: 10px; padding: 14px; overflow-y: auto; flex-shrink: 0; }
      .sb-center { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; margin: 10px; border-radius: 10px; overflow: hidden; }
      .sb-right { width: 280px; background: #35354a; margin: 10px; border-radius: 10px; padding: 14px; overflow-y: auto; flex-shrink: 0; }
      .sb-bottom {
        height: 190px; margin: 0 10px 10px 10px; border-radius: 10px; padding: 12px;
        background: rgba(45, 45, 65, 0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        flex-shrink: 0; overflow-x: auto;
      }
      .sb-section-title { font-size: 13px; color: #a8b0d0; margin-bottom: 8px; font-weight: bold; letter-spacing: 1px; }
      .sb-btn {
        width: 100%; padding: 8px 10px; background: #3d3d55; color: #fff; border: none;
        border-radius: 6px; cursor: pointer; font-size: 12px; margin-bottom: 6px;
        transition: transform 0.2s, background 0.2s; font-family: 'Courier New', monospace;
      }
      .sb-btn:hover { transform: scale(1.05); background: #4a4a68; }
      .sb-btn.active { background: #6cb8ff; color: #1a1a2e; }
      .sb-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      .sb-color-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
      .sb-color-swatch {
        height: 30px; border-radius: 6px; cursor: pointer; border: 2px solid transparent;
        transition: transform 0.2s, border-color 0.2s; position: relative;
      }
      .sb-color-swatch:hover { transform: scale(1.05); }
      .sb-color-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px #6cb8ff; }
      .sb-color-swatch .label { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; color: #a8b0d0; white-space: nowrap; }
      .sb-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 6px; }
      .sb-label { font-size: 11px; color: #a8b0d0; }
      .sb-select, .sb-input {
        background: #2a2a40; color: #fff; border: 1px solid #4a4a68; border-radius: 4px;
        padding: 4px 6px; font-size: 11px; font-family: 'Courier New', monospace;
      }
      .sb-select { flex: 1; }
      .sb-input { width: 50px; text-align: center; }
      .sb-stats-card { background: #2b2b3d; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
      .sb-stats-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
      .sb-stats-label { color: #a8b0d0; }
      .sb-stats-value { color: #fff; font-weight: bold; }
      .sb-piece-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; vertical-align: middle; }
      .sb-chart-bars { display: flex; align-items: flex-end; justify-content: space-around; height: 100px; padding: 0 8px; border-top: 1px solid #4a4a68; }
      .sb-chart-bar { width: 30px; background: #888; border-radius: 4px 4px 0 0; position: relative; transition: height 0.3s; }
      .sb-chart-bar-label { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #fff; }
      .sb-chart-xlabel { text-align: center; font-size: 10px; color: #a8b0d0; margin-top: 4px; }
      .sb-thumbnail-list { display: flex; gap: 12px; height: 160px; align-items: center; }
      .sb-thumbnail {
        width: 150px; height: 150px; border-radius: 8px; overflow: hidden; cursor: pointer;
        border: 2px solid transparent; background: #252538; flex-shrink: 0; position: relative;
        transition: transform 0.2s, border-color 0.2s;
      }
      .sb-thumbnail:hover { transform: scale(1.05); border-color: #6cb8ff; }
      .sb-thumbnail canvas { width: 100%; height: 100%; display: block; }
      .sb-thumbnail-time { position: absolute; bottom: 4px; right: 6px; font-size: 10px; color: #fff; background: rgba(0,0,0,0.6); padding: 1px 4px; border-radius: 3px; }
      .sb-thumbnail-empty { color: #888; font-size: 12px; padding: 20px; }
      .sb-ctx-menu {
        position: absolute; background: #2b2b3d; border: 1px solid #4a4a68; border-radius: 6px;
        padding: 6px; min-width: 140px; z-index: 1000; display: none; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }
      .sb-ctx-item {
        padding: 6px 10px; font-size: 11px; color: #fff; cursor: pointer; border-radius: 4px;
        font-family: 'Courier New', monospace;
      }
      .sb-ctx-item:hover { background: #3d3d55; }
      .sb-ctx-subtitle { padding: 4px 10px; font-size: 10px; color: #6cb8ff; border-bottom: 1px solid #3a3a50; margin-bottom: 2px; }
      .sb-tile-card {
        position: absolute; background: rgba(43, 43, 61, 0.95); border: 1px solid #6cb8ff;
        border-radius: 8px; padding: 12px; min-width: 200px; z-index: 999; display: none;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6); font-size: 11px;
      }
      .sb-tile-card .title { font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #6cb8ff; }
      .sb-tile-card .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .sb-tile-card .close { position: absolute; top: 4px; right: 8px; cursor: pointer; color: #888; }
      .sb-tile-card .close:hover { color: #fff; }
      .sb-piece-tool-indicator {
        padding: 6px; background: #3d3d55; border-radius: 4px; text-align: center;
        font-size: 11px; color: #a8b0d0; margin-top: 6px;
      }
      .sb-divider { height: 1px; background: #3a3a50; margin: 10px 0; }
    `;
    document.head.appendChild(style);

    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'sb-container';

    const main = document.createElement('div');
    main.className = 'sb-main';

    this.leftPanel.className = 'sb-left';
    this.centerWrapper.className = 'sb-center';
    this.rightPanel.className = 'sb-right';
    this.bottomBar.className = 'sb-bottom';

    main.appendChild(this.leftPanel);
    main.appendChild(this.centerWrapper);
    main.appendChild(this.rightPanel);

    root.appendChild(main);
    root.appendChild(this.bottomBar);
    this.container.appendChild(root);

    const mapCanvas = this.tileMapEditor['canvas'];
    mapCanvas.style.position = 'absolute';
    mapCanvas.style.top = '0';
    mapCanvas.style.left = '0';
    this.centerWrapper.appendChild(mapCanvas);

    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.centerWrapper.appendChild(this.overlayCanvas);

    this.statsContainer.className = 'sb-stats-container';
    this.chartContainer.className = 'sb-chart-container';
    this.thumbnailContainer.className = 'sb-thumbnail-list';
    this.contextMenu.className = 'sb-ctx-menu';
    this.tileInfoCard.className = 'sb-tile-card';

    document.body.appendChild(this.contextMenu);
    document.body.appendChild(this.tileInfoCard);

    this.buildLeftPanel();
    this.buildRightPanel();
    this.buildBottomBar();
    this.handleResize();
  }

  private buildLeftPanel(): void {
    const panel = this.leftPanel;

    const title1 = document.createElement('div');
    title1.className = 'sb-section-title';
    title1.textContent = '网格类型';
    panel.appendChild(title1);

    const btnRow1 = document.createElement('div');
    btnRow1.style.display = 'flex';
    btnRow1.style.gap = '6px';

    const btnSq = document.createElement('button');
    btnSq.className = 'sb-btn active';
    btnSq.textContent = '方形';
    btnSq.style.flex = '1';
    btnSq.onclick = () => {
      btnSq.classList.add('active');
      btnHex.classList.remove('active');
      this.tileMapEditor.setConfig({ type: 'square' });
      this.pathSimulator.clearPieces();
    };
    const btnHex = document.createElement('button');
    btnHex.className = 'sb-btn';
    btnHex.textContent = '六边形';
    btnHex.style.flex = '1';
    btnHex.onclick = () => {
      btnHex.classList.add('active');
      btnSq.classList.remove('active');
      this.tileMapEditor.setConfig({ type: 'hexagon' });
      this.pathSimulator.clearPieces();
    };
    btnRow1.appendChild(btnSq);
    btnRow1.appendChild(btnHex);
    panel.appendChild(btnRow1);

    const title2 = document.createElement('div');
    title2.className = 'sb-section-title';
    title2.style.marginTop = '14px';
    title2.textContent = '网格大小';
    panel.appendChild(title2);

    const sizeRow = document.createElement('div');
    sizeRow.className = 'sb-row';
    const lblRows = document.createElement('span');
    lblRows.className = 'sb-label';
    lblRows.textContent = '行';
    const inpRows = document.createElement('input');
    inpRows.type = 'number';
    inpRows.min = '3'; inpRows.max = '10';
    inpRows.value = '6';
    inpRows.className = 'sb-input';
    inpRows.onchange = () => {
      const r = Math.max(3, Math.min(10, parseInt(inpRows.value) || 6));
      inpRows.value = String(r);
      this.tileMapEditor.setConfig({ rows: r });
      this.pathSimulator.clearPieces();
    };
    const lblCols = document.createElement('span');
    lblCols.className = 'sb-label';
    lblCols.textContent = '列';
    const inpCols = document.createElement('input');
    inpCols.type = 'number';
    inpCols.min = '3'; inpCols.max = '10';
    inpCols.value = '6';
    inpCols.className = 'sb-input';
    inpCols.onchange = () => {
      const c = Math.max(3, Math.min(10, parseInt(inpCols.value) || 6));
      inpCols.value = String(c);
      this.tileMapEditor.setConfig({ cols: c });
      this.pathSimulator.clearPieces();
    };
    sizeRow.appendChild(lblRows);
    sizeRow.appendChild(inpRows);
    sizeRow.appendChild(lblCols);
    sizeRow.appendChild(inpCols);
    panel.appendChild(sizeRow);

    const div1 = document.createElement('div');
    div1.className = 'sb-divider';
    panel.appendChild(div1);

    const title3 = document.createElement('div');
    title3.className = 'sb-section-title';
    title3.textContent = '格子颜色';
    panel.appendChild(title3);

    const colorGrid = document.createElement('div');
    colorGrid.className = 'sb-color-grid';
    PRESET_COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'sb-color-swatch' + (c.value === this.selectedColor ? ' active' : '');
      sw.style.background = c.value;
      sw.style.paddingBottom = '18px';
      const lbl = document.createElement('span');
      lbl.className = 'label';
      lbl.textContent = c.name;
      sw.appendChild(lbl);
      sw.onclick = () => {
        this.selectedColor = c.value;
        this.toolMode = 'edit';
        btnEdit.classList.add('active');
        btnPiece.classList.remove('active');
        colorGrid.querySelectorAll('.sb-color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
      };
      colorGrid.appendChild(sw);
    });
    panel.appendChild(colorGrid);

    const div2 = document.createElement('div');
    div2.className = 'sb-divider';
    panel.appendChild(div2);

    const title4 = document.createElement('div');
    title4.className = 'sb-section-title';
    title4.textContent = '工具模式';
    panel.appendChild(title4);

    const btnEdit = document.createElement('button');
    btnEdit.className = 'sb-btn active';
    btnEdit.textContent = '🎨 编辑格子';
    btnEdit.onclick = () => {
      this.toolMode = 'edit';
      btnEdit.classList.add('active');
      btnPiece.classList.remove('active');
    };
    panel.appendChild(btnEdit);

    const btnPiece = document.createElement('button');
    btnPiece.className = 'sb-btn';
    btnPiece.textContent = '♟ 放置棋子';
    btnPiece.onclick = () => {
      this.toolMode = 'placePiece';
      btnPiece.classList.add('active');
      btnEdit.classList.remove('active');
    };
    panel.appendChild(btnPiece);

    const pieceIndicator = document.createElement('div');
    pieceIndicator.className = 'sb-piece-tool-indicator';
    pieceIndicator.textContent = `剩余可放置: ${this.pathSimulator.getAvailablePieceCount()}/4`;
    this.pathSimulator.onPieceMove(() => {
      pieceIndicator.textContent = `剩余可放置: ${this.pathSimulator.getAvailablePieceCount()}/4`;
    });
    panel.appendChild(pieceIndicator);

    const btnClear = document.createElement('button');
    btnClear.className = 'sb-btn';
    btnClear.style.marginTop = '10px';
    btnClear.style.background = '#5a3a3a';
    btnClear.textContent = '清空棋子';
    btnClear.onclick = () => {
      this.pathSimulator.clearPieces();
    };
    panel.appendChild(btnClear);
  }

  private buildRightPanel(): void {
    const panel = this.rightPanel;

    const title1 = document.createElement('div');
    title1.className = 'sb-section-title';
    title1.textContent = '模拟控制';
    panel.appendChild(title1);

    const btnStart = document.createElement('button');
    btnStart.className = 'sb-btn';
    btnStart.style.background = '#3a5a3a';
    btnStart.textContent = '▶ 开始模拟';
    btnStart.onclick = () => {
      if (!this.pathSimulator.isSimulationRunning()) {
        this.pathSimulator.startSimulation(50);
      }
    };

    const btnStop = document.createElement('button');
    btnStop.className = 'sb-btn';
    btnStop.style.background = '#5a3a3a';
    btnStop.textContent = '■ 停止模拟';
    btnStop.onclick = () => {
      this.pathSimulator.stopSimulation();
    };

    this.pathSimulator.onPieceMove(() => {
      btnStart.disabled = this.pathSimulator.isSimulationRunning() || this.pathSimulator.getPieces().length === 0;
      btnStop.disabled = !this.pathSimulator.isSimulationRunning();
    });

    panel.appendChild(btnStart);
    panel.appendChild(btnStop);

    const stepsRow = document.createElement('div');
    stepsRow.className = 'sb-row';
    const lblSteps = document.createElement('span');
    lblSteps.className = 'sb-label';
    lblSteps.textContent = '最大步数';
    const inpSteps = document.createElement('input');
    inpSteps.type = 'number';
    inpSteps.min = '10'; inpSteps.max = '200';
    inpSteps.value = '50';
    inpSteps.className = 'sb-input';
    stepsRow.appendChild(lblSteps);
    stepsRow.appendChild(inpSteps);
    panel.appendChild(stepsRow);

    const div1 = document.createElement('div');
    div1.className = 'sb-divider';
    panel.appendChild(div1);

    const title2 = document.createElement('div');
    title2.className = 'sb-section-title';
    title2.textContent = '棋子状态';
    panel.appendChild(title2);

    this.statsContainer.style.marginBottom = '10px';
    panel.appendChild(this.statsContainer);

    const div2 = document.createElement('div');
    div2.className = 'sb-divider';
    panel.appendChild(div2);

    const title3 = document.createElement('div');
    title3.className = 'sb-section-title';
    title3.textContent = '探索覆盖率对比';
    panel.appendChild(title3);

    panel.appendChild(this.chartContainer);
    this.renderChart([]);
    this.renderStats([]);
  }

  private buildBottomBar(): void {
    const title = document.createElement('div');
    title.className = 'sb-section-title';
    title.textContent = '历史快照（点击还原，最多10个）';
    title.style.marginBottom = '8px';
    this.bottomBar.appendChild(title);
    this.bottomBar.appendChild(this.thumbnailContainer);

    const empty = document.createElement('div');
    empty.className = 'sb-thumbnail-empty';
    empty.textContent = '暂无快照，模拟结束后自动保存';
    this.thumbnailContainer.appendChild(empty);
  }

  private bindGlobalEvents(): void {
    window.addEventListener('resize', () => this.handleResize());

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.sb-ctx-menu')) {
        this.hideContextMenu();
      }
    });

    this.tileMapEditor.onSelect((tile, x, y) => {
      this.handleTileSelect(tile, x, y);
    });

    this.tileMapEditor['canvas'].addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const rect = this.tileMapEditor['canvas'].getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const tile = this.tileMapEditor.getTileAt(mx, my);
      if (tile) {
        this.showContextMenu(e.clientX, e.clientY, tile);
      }
    });
  }

  private handleTileSelect(tile: Tile | null, _x: number, _y: number): void {
    if (!tile) {
      this.hideTileCard();
      return;
    }

    if (this.toolMode === 'edit') {
      this.tileMapEditor.setTileColor(tile, this.selectedColor);
    } else if (this.toolMode === 'placePiece') {
      if (tile.passType !== 'blocked') {
        this.pathSimulator.createPiece(tile.row, tile.col);
      }
    }

    this.showTileCard(tile);
  }

  private showContextMenu(clientX: number, clientY: number, tile: Tile): void {
    this.tileMapEditor['selectedTile'] = tile;
    this.tileMapEditor.render();

    this.contextMenu.innerHTML = '';

    const sub1 = document.createElement('div');
    sub1.className = 'sb-ctx-subtitle';
    sub1.textContent = '设置颜色';
    this.contextMenu.appendChild(sub1);

    const colorWrap = document.createElement('div');
    colorWrap.style.display = 'grid';
    colorWrap.style.gridTemplateColumns = 'repeat(3, 1fr)';
    colorWrap.style.gap = '4px';
    colorWrap.style.padding = '4px';
    PRESET_COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.style.height = '20px';
      sw.style.borderRadius = '4px';
      sw.style.background = c.value;
      sw.style.cursor = 'pointer';
      sw.title = c.name;
      sw.onclick = () => {
        this.tileMapEditor.setTileColor(tile, c.value);
        this.hideContextMenu();
      };
      colorWrap.appendChild(sw);
    });
    this.contextMenu.appendChild(colorWrap);

    const sub2 = document.createElement('div');
    sub2.className = 'sb-ctx-subtitle';
    sub2.textContent = '通行类型';
    this.contextMenu.appendChild(sub2);

    const passTypes: Array<{ k: PassType; label: string }> = [
      { k: 'passable', label: '可通行' },
      { k: 'blocked', label: '阻挡' },
      { k: 'oneway', label: '单向(→)' }
    ];
    passTypes.forEach(pt => {
      const item = document.createElement('div');
      item.className = 'sb-ctx-item';
      item.textContent = pt.label;
      if (tile.passType === pt.k) item.style.color = '#6cb8ff';
      item.onclick = () => {
        this.tileMapEditor.setTilePassType(tile, pt.k, 'right');
        this.hideContextMenu();
      };
      this.contextMenu.appendChild(item);
    });

    const sub3 = document.createElement('div');
    sub3.className = 'sb-ctx-subtitle';
    sub3.textContent = '设置标签';
    this.contextMenu.appendChild(sub3);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = tile.label;
    labelInput.placeholder = '输入标签文字';
    labelInput.className = 'sb-input';
    labelInput.style.width = 'calc(100% - 8px)';
    labelInput.style.margin = '4px';
    labelInput.onkeydown = (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        this.tileMapEditor.setTileLabel(tile, labelInput.value);
        this.hideContextMenu();
      }
    };
    this.contextMenu.appendChild(labelInput);

    this.contextMenu.style.display = 'block';
    this.contextMenu.style.left = Math.min(clientX, window.innerWidth - 160) + 'px';
    this.contextMenu.style.top = Math.min(clientY, window.innerHeight - 300) + 'px';
  }

  private hideContextMenu(): void {
    this.contextMenu.style.display = 'none';
  }

  private showTileCard(tile: Tile): void {
    const center = this.tileMapEditor.getTileCenter(tile.row, tile.col);
    const rect = this.centerWrapper.getBoundingClientRect();

    const visitInfo = this.pathSimulator.getVisitInfo();
    const key = `${tile.row},${tile.col}`;
    const info = visitInfo.get(key);

    this.highlightPaths = this.pathSimulator.getShortestPathToEnds(tile.row, tile.col);

    this.tileInfoCard.innerHTML = '';
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => {
      this.hideTileCard();
      this.highlightPaths = [];
    };
    this.tileInfoCard.appendChild(closeBtn);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `格子 (${tile.row}, ${tile.col})`;
    this.tileInfoCard.appendChild(title);

    const colorRow = document.createElement('div');
    colorRow.className = 'row';
    colorRow.innerHTML = `<span>颜色:</span><span style="display:inline-block;width:14px;height:14px;background:${tile.color};border-radius:3px;vertical-align:middle;"></span>`;
    this.tileInfoCard.appendChild(colorRow);

    const labelRow = document.createElement('div');
    labelRow.className = 'row';
    labelRow.innerHTML = `<span>标签:</span><span>${tile.label || '—'}</span>`;
    this.tileInfoCard.appendChild(labelRow);

    const passLabels: Record<PassType, string> = {
      passable: '可通行',
      blocked: '阻挡',
      oneway: `单向(${tile.onewayDirection || '→'})`
    };
    const passRow = document.createElement('div');
    passRow.className = 'row';
    passRow.innerHTML = `<span>通行:</span><span>${passLabels[tile.passType]}</span>`;
    this.tileInfoCard.appendChild(passRow);

    const visitRow = document.createElement('div');
    visitRow.className = 'row';
    visitRow.innerHTML = `<span>总访问:</span><span>${info?.totalVisits ?? 0}</span>`;
    this.tileInfoCard.appendChild(visitRow);

    const lastRow = document.createElement('div');
    lastRow.className = 'row';
    const lastColor = info?.lastVisitorColor;
    lastRow.innerHTML = `<span>最后访客:</span><span>${lastColor ? `<span style="display:inline-block;width:10px;height:10px;background:${lastColor};border-radius:50%;vertical-align:middle;margin-right:4px;"></span>` : '—'}</span>`;
    this.tileInfoCard.appendChild(lastRow);

    if (this.highlightPaths.length > 0) {
      const distTitle = document.createElement('div');
      distTitle.style.marginTop = '8px';
      distTitle.style.color = '#6cb8ff';
      distTitle.style.fontWeight = 'bold';
      distTitle.textContent = '到终点最短路径:';
      this.tileInfoCard.appendChild(distTitle);

      this.highlightPaths.forEach((hp, i) => {
        const r = document.createElement('div');
        r.className = 'row';
        r.innerHTML = `<span>终点 ${i + 1} (${hp.targetRow},${hp.targetCol}):</span><span>${hp.distance} 步</span>`;
        this.tileInfoCard.appendChild(r);
      });
    } else {
      const distTitle = document.createElement('div');
      distTitle.style.marginTop = '8px';
      distTitle.style.color = '#888';
      distTitle.textContent = '(无终点格子，请先设置紫色终点)';
      this.tileInfoCard.appendChild(distTitle);
    }

    this.tileInfoCard.style.display = 'block';
    const cardLeft = rect.left + center.x + 20;
    const cardTop = rect.top + center.y - 20;
    this.tileInfoCard.style.left = Math.min(cardLeft, window.innerWidth - 240) + 'px';
    this.tileInfoCard.style.top = Math.max(10, Math.min(cardTop, window.innerHeight - 300)) + 'px';
  }

  private hideTileCard(): void {
    this.tileInfoCard.style.display = 'none';
    this.highlightPaths = [];
  }

  private subscribeData(): void {
    this.pathSimulator.onStatsUpdate((stats) => {
      this.renderStats(stats);
      this.renderChart(stats);
    });

    this.pathSimulator.onSimulationEnd(() => {
      this.captureSnapshot();
    });
  }

  private renderStats(stats: PieceStats[]): void {
    this.statsContainer.innerHTML = '';
    if (stats.length === 0) {
      const empty = document.createElement('div');
      empty.style.fontSize = '11px';
      empty.style.color = '#888';
      empty.textContent = '暂无棋子，切换到"放置棋子"模式点击画布添加';
      this.statsContainer.appendChild(empty);
      return;
    }

    stats.forEach(s => {
      const card = document.createElement('div');
      card.className = 'sb-stats-card';
      const nameMap: Record<string, string> = { red: '红方', blue: '蓝方', green: '绿方', yellow: '黄方' };
      card.innerHTML = `
        <div style="margin-bottom:6px;">
          <span class="sb-piece-dot" style="background:${s.color}"></span>
          <span style="font-size:12px;font-weight:bold;">${nameMap[s.colorKey] || s.colorKey}</span>
        </div>
        <div class="sb-stats-row"><span class="sb-stats-label">已走步数</span><span class="sb-stats-value">${s.steps}</span></div>
        <div class="sb-stats-row"><span class="sb-stats-label">访问格子</span><span class="sb-stats-value">${s.visitedCount}</span></div>
        <div class="sb-stats-row"><span class="sb-stats-label">重复访问</span><span class="sb-stats-value">${s.repeatVisits}</span></div>
        <div class="sb-stats-row"><span class="sb-stats-label">覆盖率</span><span class="sb-stats-value">${(s.coverageRate * 100).toFixed(0)}%</span></div>
      `;
      this.statsContainer.appendChild(card);
    });
  }

  private renderChart(stats: PieceStats[]): void {
    this.chartContainer.innerHTML = '';
    const bars = document.createElement('div');
    bars.className = 'sb-chart-bars';

    if (stats.length === 0) {
      const empty = document.createElement('div');
      empty.style.width = '100%';
      empty.style.textAlign = 'center';
      empty.style.fontSize = '11px';
      empty.style.color = '#888';
      empty.style.alignSelf = 'center';
      empty.textContent = '等待模拟...';
      bars.appendChild(empty);
    } else {
      const maxCov = Math.max(0.01, ...stats.map(s => s.coverageRate));
      stats.forEach(s => {
        const col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.alignItems = 'center';
        col.style.justifyContent = 'flex-end';
        col.style.height = '100%';

        const bar = document.createElement('div');
        bar.className = 'sb-chart-bar';
        bar.style.background = s.color;
        bar.style.height = `${(s.coverageRate / maxCov) * 80}px`;
        const label = document.createElement('div');
        label.className = 'sb-chart-bar-label';
        label.textContent = `${(s.coverageRate * 100).toFixed(0)}%`;
        bar.appendChild(label);

        const xLabel = document.createElement('div');
        xLabel.className = 'sb-chart-xlabel';
        const nameMap: Record<string, string> = { red: '红', blue: '蓝', green: '绿', yellow: '黄' };
        xLabel.textContent = nameMap[s.colorKey] || s.colorKey;

        col.appendChild(bar);
        col.appendChild(xLabel);
        bars.appendChild(col);
      });
    }

    this.chartContainer.appendChild(bars);
  }

  private captureSnapshot(): void {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 150;
    thumbCanvas.height = 150;
    const tctx = thumbCanvas.getContext('2d')!;

    const srcCanvas = this.tileMapEditor['canvas'];
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const scale = Math.min(150 / srcW, 150 / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    tctx.fillStyle = '#252538';
    tctx.fillRect(0, 0, 150, 150);
    tctx.drawImage(this.overlayCanvas, 0, 0, srcW, srcH, (150 - dw) / 2, (150 - dh) / 2, dw, dh);
    tctx.drawImage(srcCanvas, 0, 0, srcW, srcH, (150 - dw) / 2, (150 - dh) / 2, dw, dh);

    const snapshot: Snapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      tileMap: JSON.parse(JSON.stringify(this.tileMapEditor.getTiles())),
      pieces: JSON.parse(JSON.stringify(
        this.pathSimulator.getPieces().map(p => ({
          ...p,
          visitedTiles: Array.from(p.visitedTiles)
        }))
      )),
      thumbnailDataUrl: thumbCanvas.toDataURL()
    };

    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > 10) this.snapshots.pop();
    this.renderThumbnails();
  }

  private renderThumbnails(): void {
    this.thumbnailContainer.innerHTML = '';
    if (this.snapshots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sb-thumbnail-empty';
      empty.textContent = '暂无快照，模拟结束后自动保存';
      this.thumbnailContainer.appendChild(empty);
      return;
    }

    this.snapshots.forEach((snap) => {
      const thumb = document.createElement('div');
      thumb.className = 'sb-thumbnail';

      const img = document.createElement('img');
      img.src = snap.thumbnailDataUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      thumb.appendChild(img);

      const timeLbl = document.createElement('div');
      timeLbl.className = 'sb-thumbnail-time';
      const d = new Date(snap.timestamp);
      timeLbl.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      thumb.appendChild(timeLbl);

      thumb.onclick = () => this.restoreSnapshot(snap);
      this.thumbnailContainer.appendChild(thumb);
    });
  }

  private restoreSnapshot(snap: Snapshot): void {
    this.diffTiles.clear();
    const currentTiles = this.tileMapEditor.getTiles();
    for (let r = 0; r < snap.tileMap.length; r++) {
      for (let c = 0; c < snap.tileMap[r].length; c++) {
        const cur = currentTiles[r]?.[c];
        const old = snap.tileMap[r][c];
        if (!cur || cur.color !== old.color || cur.label !== old.label || cur.passType !== old.passType) {
          this.diffTiles.add(`${r},${c}`);
        }
      }
    }

    this.tileMapEditor.setTiles(snap.tileMap);
    const pieces = snap.pieces.map(p => ({
      ...p,
      visitedTiles: new Set(p.visitedTiles as unknown as string[])
    }));
    this.pathSimulator.setPieces(pieces);

    setTimeout(() => { this.diffTiles.clear(); }, 3000);
  }

  private startAnimationLoop(): void {
    const tick = () => {
      this.animFrame++;
      this.renderOverlay();
      const paths = this.highlightPaths.flatMap(hp => hp.path);
      this.tileMapEditor.render(paths.length > 0 ? paths : undefined, this.animFrame);
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  private renderOverlay(): void {
    const ctx = this.overlayCtx;
    const srcCanvas = this.tileMapEditor['canvas'];
    if (this.overlayCanvas.width !== srcCanvas.width || this.overlayCanvas.height !== srcCanvas.height) {
      this.overlayCanvas.width = srcCanvas.width;
      this.overlayCanvas.height = srcCanvas.height;
    }
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    if (this.diffTiles.size > 0) {
      ctx.save();
      for (const key of this.diffTiles) {
        const [r, c] = key.split(',').map(Number);
        const bbox = this.tileMapEditor.getTileBounding(r, c);
        ctx.fillStyle = 'rgba(255, 80, 80, 0.25)';
        ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);
      }
      ctx.restore();
    }

    const pieces = this.pathSimulator.getPieces();
    for (const piece of pieces) {
      this.drawPieceTrail(ctx, piece);
    }

    for (const piece of pieces) {
      this.drawPiece(ctx, piece);
    }
  }

  private drawPieceTrail(ctx: CanvasRenderingContext2D, piece: Piece): void {
    if (piece.path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = piece.color + '66';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < piece.path.length; i++) {
      const pt = piece.path[i];
      const center = this.tileMapEditor.getTileCenter(pt.row, pt.col);
      if (i === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    }
    ctx.stroke();

    for (let i = 0; i < piece.path.length - 1; i++) {
      const pt = piece.path[i];
      const center = this.tileMapEditor.getTileCenter(pt.row, pt.col);
      ctx.fillStyle = piece.color + '44';
      ctx.beginPath();
      ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece): void {
    const config = this.tileMapEditor.getConfig();
    const target = this.tileMapEditor.getTileCenter(piece.row, piece.col);
    const from = piece.prevRow !== undefined && piece.prevCol !== undefined
      ? this.tileMapEditor.getTileCenter(piece.prevRow, piece.prevCol)
      : target;

    const progress = Math.min(1, (performance.now() - (piece.path[piece.path.length - 1]?.timestamp || performance.now() - 300)) / 300);
    const ease = 1 - Math.pow(1 - progress, 3);
    const x = from.x + (target.x - from.x) * ease;
    const y = from.y + (target.y - from.y) * ease;

    const r = Math.max(12, config.tileSize * 0.3);

    ctx.save();

    const gradient = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, piece.color);
    gradient.addColorStop(1, this.darkenColor(piece.color, 0.5));

    ctx.shadowColor = piece.color;
    ctx.shadowBlur = 12;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = piece.color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private darkenColor(hex: string, factor: number): string {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return hex;
    const r = Math.floor(parseInt(m[1], 16) * factor);
    const g = Math.floor(parseInt(m[2], 16) * factor);
    const b = Math.floor(parseInt(m[3], 16) * factor);
    return `rgb(${r},${g},${b})`;
  }

  private handleResize(): void {
    const rect = this.centerWrapper.getBoundingClientRect();
    const w = Math.max(400, rect.width);
    const h = Math.max(400, rect.height);
    this.tileMapEditor.resize(w, h);
  }

  public destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
