import { TSHIRT_COLORS } from './tshirt';
import { DesignManager, TextElement, ImageElement, DesignElement } from './design';

export interface UICallbacks {
  onColorChange: (color: string) => void;
  onAddText: (content: string, fontSize: number, color: string) => void;
  onAddImage: (file: File) => void;
  onUpdateText: (id: string, updates: Partial<Omit<TextElement, 'id' | 'type'>>) => void;
  onDeleteElement: (id: string) => void;
  onSelectElement: (id: string | null) => void;
  onUndo: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
}

export class UIManager {
  private container: HTMLElement;
  private designManager: DesignManager;
  private callbacks: UICallbacks;
  private newTextColor: string = '#000000';
  private newFontSize: number = 32;

  constructor(container: HTMLElement, designManager: DesignManager, callbacks: UICallbacks) {
    this.container = container;
    this.designManager = designManager;
    this.callbacks = callbacks;
    this.render();
    this.designManager.subscribe(() => this.render());
  }

  private render(): void {
    this.container.innerHTML = '';

    this.renderTitle();
    this.renderColorSection();
    this.renderTextSection();
    this.renderImageSection();
    this.renderElementsSection();
    this.renderHistorySection();
  }

  private renderTitle(): void {
    const title = document.createElement('div');
    title.className = 'panel-section';
    title.innerHTML = `
      <h1 style="font-size: 20px; font-weight: 700; color: #e94560; margin-bottom: 4px;">T恤定制工具</h1>
      <p style="font-size: 12px; color: #888;">设计你的专属T恤</p>
    `;
    this.container.appendChild(title);
  }

  private renderColorSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'T恤颜色';
    section.appendChild(title);

    const colorGrid = document.createElement('div');
    colorGrid.className = 'color-grid';

    const currentColor = this.designManager.getColor();
    TSHIRT_COLORS.forEach(({ name, color }) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (color.toLowerCase() === currentColor.toLowerCase() ? ' active' : '');
      swatch.style.backgroundColor = color;
      swatch.title = name;
      swatch.addEventListener('click', () => {
        this.callbacks.onColorChange(color);
      });
      colorGrid.appendChild(swatch);
    });

    section.appendChild(colorGrid);
    this.container.appendChild(section);
  }

  private renderTextSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '添加文字';
    section.appendChild(title);

    const textInputLabel = document.createElement('label');
    textInputLabel.textContent = '文字内容（最多20字）';
    section.appendChild(textInputLabel);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = '输入文字...';
    textInput.maxLength = 20;
    section.appendChild(textInput);

    const fontSizeLabel = document.createElement('label');
    fontSizeLabel.textContent = '字体大小';
    section.appendChild(fontSizeLabel);

    const fontSizeRow = document.createElement('div');
    fontSizeRow.className = 'input-row';

    const fontSizeSlider = document.createElement('input');
    fontSizeSlider.type = 'range';
    fontSizeSlider.min = '12';
    fontSizeSlider.max = '48';
    fontSizeSlider.value = this.newFontSize.toString();

    const fontSizeValue = document.createElement('span');
    fontSizeValue.className = 'value-display';
    fontSizeValue.textContent = `${this.newFontSize}px`;

    fontSizeSlider.addEventListener('input', () => {
      this.newFontSize = parseInt(fontSizeSlider.value, 10);
      fontSizeValue.textContent = `${this.newFontSize}px`;
    });

    fontSizeRow.appendChild(fontSizeSlider);
    fontSizeRow.appendChild(fontSizeValue);
    section.appendChild(fontSizeRow);

    const textColorLabel = document.createElement('label');
    textColorLabel.textContent = '文字颜色';
    section.appendChild(textColorLabel);

    const textColorInput = document.createElement('input');
    textColorInput.type = 'color';
    textColorInput.value = this.newTextColor;
    textColorInput.addEventListener('input', () => {
      this.newTextColor = textColorInput.value;
    });
    section.appendChild(textColorInput);

    const addButton = document.createElement('button');
    addButton.textContent = '添加文字';
    addButton.addEventListener('click', () => {
      const content = textInput.value.trim();
      if (content) {
        this.callbacks.onAddText(content, this.newFontSize, this.newTextColor);
        textInput.value = '';
      }
    });
    section.appendChild(addButton);

    this.container.appendChild(section);
  }

  private renderImageSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '上传图案';
    section.appendChild(title);

    const uploadArea = document.createElement('div');
    uploadArea.className = 'upload-area';
    uploadArea.innerHTML = `
      <div class="upload-area-text">点击或拖拽上传图片</div>
      <div class="upload-area-hint">支持 PNG/JPG，最大 2MB</div>
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/jpg';
    fileInput.style.display = 'none';

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#e94560';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.handleImageFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleImageFile(fileInput.files[0]);
      }
    });

    section.appendChild(uploadArea);
    section.appendChild(fileInput);
    this.container.appendChild(section);
  }

  private handleImageFile(file: File): void {
    if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
      alert('请上传 PNG 或 JPG 格式的图片');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    this.callbacks.onAddImage(file);
  }

  private renderElementsSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '设计元素';
    section.appendChild(title);

    const elements = this.designManager.getElements();
    const selectedId = this.designManager.getSelectedElementId();

    if (elements.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无设计元素，添加文字或上传图案开始设计';
      section.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'design-list';

      elements.forEach((element) => {
        list.appendChild(this.renderElementItem(element, element.id === selectedId));
      });

      section.appendChild(list);

      if (selectedId) {
        const selected = this.designManager.getSelectedElement();
        if (selected && selected.type === 'text') {
          section.appendChild(this.renderTextEditor(selected as TextElement));
        }
      }
    }

    this.container.appendChild(section);
  }

  private renderElementItem(element: DesignElement, isSelected: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = 'design-item' + (isSelected ? ' selected' : '');

    const content = document.createElement('div');
    content.className = 'design-item-content';

    if (element.type === 'text') {
      const textEl = element as TextElement;
      const colorPreview = document.createElement('div');
      colorPreview.style.width = '20px';
      colorPreview.style.height = '20px';
      colorPreview.style.borderRadius = '4px';
      colorPreview.style.backgroundColor = textEl.color;
      colorPreview.style.border = '1px solid #555';
      content.appendChild(colorPreview);

      const textSpan = document.createElement('span');
      textSpan.className = 'design-item-text';
      textSpan.textContent = `文字: "${textEl.content}"`;
      content.appendChild(textSpan);
    } else {
      const imgEl = element as ImageElement;
      const thumbnail = document.createElement('img');
      thumbnail.className = 'design-item-thumbnail';
      thumbnail.src = imgEl.dataUrl;
      thumbnail.alt = '图案缩略图';
      content.appendChild(thumbnail);

      const textSpan = document.createElement('span');
      textSpan.className = 'design-item-text';
      textSpan.textContent = '图案';
      content.appendChild(textSpan);
    }

    const actions = document.createElement('div');
    actions.className = 'design-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary';
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onSelectElement(element.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onDeleteElement(element.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(content);
    item.appendChild(actions);

    item.addEventListener('click', () => {
      this.callbacks.onSelectElement(element.id);
    });

    return item;
  }

  private renderTextEditor(text: TextElement): HTMLElement {
    const editor = document.createElement('div');
    editor.className = 'panel-section';
    editor.style.padding = '12px';
    editor.style.backgroundColor = '#0f3460';
    editor.style.borderRadius = '8px';
    editor.style.marginTop = '8px';

    const title = document.createElement('div');
    title.style.fontSize = '14px';
    title.style.fontWeight = '600';
    title.style.marginBottom = '12px';
    title.textContent = '编辑文字';
    editor.appendChild(title);

    const contentLabel = document.createElement('label');
    contentLabel.textContent = '内容';
    editor.appendChild(contentLabel);

    const contentInput = document.createElement('input');
    contentInput.type = 'text';
    contentInput.value = text.content;
    contentInput.maxLength = 20;
    editor.appendChild(contentInput);

    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = '字体大小';
    sizeLabel.style.marginTop = '10px';
    editor.appendChild(sizeLabel);

    const sizeRow = document.createElement('div');
    sizeRow.className = 'input-row';

    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.min = '12';
    sizeSlider.max = '48';
    sizeSlider.value = text.fontSize.toString();

    const sizeValue = document.createElement('span');
    sizeValue.className = 'value-display';
    sizeValue.textContent = `${text.fontSize}px`;

    sizeSlider.addEventListener('input', () => {
      sizeValue.textContent = `${sizeSlider.value}px`;
    });

    sizeRow.appendChild(sizeSlider);
    sizeRow.appendChild(sizeValue);
    editor.appendChild(sizeRow);

    const colorLabel = document.createElement('label');
    colorLabel.textContent = '颜色';
    colorLabel.style.marginTop = '10px';
    editor.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = text.color;
    editor.appendChild(colorInput);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存修改';
    saveBtn.style.marginTop = '12px';
    saveBtn.addEventListener('click', () => {
      this.callbacks.onUpdateText(text.id, {
        content: contentInput.value,
        fontSize: parseInt(sizeSlider.value, 10),
        color: colorInput.value
      });
    });
    editor.appendChild(saveBtn);

    return editor;
  }

  private renderHistorySection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.justifyContent = 'space-between';
    titleRow.style.marginBottom = '8px';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.style.border = 'none';
    title.style.padding = '0';
    title.style.margin = '0';
    title.textContent = '历史记录';
    titleRow.appendChild(title);

    const undoBtn = document.createElement('button');
    undoBtn.className = 'secondary';
    undoBtn.textContent = '撤销';
    undoBtn.style.padding = '6px 12px';
    undoBtn.style.fontSize = '12px';
    undoBtn.disabled = !this.designManager.canUndo();
    undoBtn.addEventListener('click', () => {
      this.callbacks.onUndo();
    });
    titleRow.appendChild(undoBtn);

    section.appendChild(titleRow);

    const history = this.designManager.getHistory();
    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无历史记录';
      section.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'history-list';

      history.forEach((snapshot, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-item-info';

        const label = document.createElement('div');
        label.className = 'history-item-label';
        label.textContent = `版本 ${history.length - index}`;
        info.appendChild(label);

        const time = document.createElement('div');
        time.className = 'history-item-time';
        const date = new Date(snapshot.timestamp);
        time.textContent = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        info.appendChild(time);

        const colorDot = document.createElement('div');
        colorDot.className = 'history-item-color';
        colorDot.style.backgroundColor = snapshot.color;

        item.appendChild(info);
        item.appendChild(colorDot);

        item.addEventListener('click', () => {
          this.callbacks.onRestoreSnapshot(snapshot.id);
        });

        list.appendChild(item);
      });

      section.appendChild(list);
    }

    this.container.appendChild(section);
  }
}
