import { ScentRecord } from './types';
import { fadeIn, drawGlow } from './animations';

export interface ScentTimelineHandle {
  addRecord: (record: ScentRecord) => void;
  updateRecord: (id: string, data: Partial<ScentRecord>) => void;
  searchAndHighlight: (query: string) => ScentRecord[];
  clearHighlights: () => void;
  getRecords: () => ScentRecord[];
  destroy: () => void;
  showNoResultTip: (show: boolean, onAddClick?: () => void) => void;
}

export function createScentTimeline(container: HTMLElement): ScentTimelineHandle {
  const records: ScentRecord[] = [];
  const dotMap = new Map<string, { element: HTMLDivElement; glowCanvas?: HTMLCanvasElement }>();

  const header = document.createElement('div');
  header.className = 'timeline-header';
  header.innerHTML = `
    <h2 style="margin:0;font-size:18px;color:#EAEAEA;">气味画像</h2>
    <span style="font-size:12px;color:#A0A0B0;">点击圆点查看详情，长按编辑</span>
  `;
  header.style.padding = '16px 20px';
  header.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
  header.style.display = 'flex';
  header.style.flexDirection = 'column';
  header.style.gap = '4px';

  const tipContainer = document.createElement('div');
  tipContainer.className = 'no-result-tip';
  tipContainer.style.display = 'none';
  tipContainer.style.padding = '12px 20px';
  tipContainer.style.color = '#F4D03F';
  tipContainer.style.fontSize = '13px';
  tipContainer.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
  tipContainer.style.opacity = '0';
  tipContainer.style.transition = 'opacity 0.2s ease';

  const tipText = document.createElement('span');
  tipText.textContent = '未找到，是否尝试添加此类气味？';
  tipText.style.marginRight = '8px';

  const tipBtn = document.createElement('button');
  tipBtn.textContent = '添加';
  tipBtn.style.padding = '4px 12px';
  tipBtn.style.border = 'none';
  tipBtn.style.borderRadius = '8px';
  tipBtn.style.background = 'rgba(244, 208, 63, 0.2)';
  tipBtn.style.color = '#F4D03F';
  tipBtn.style.cursor = 'pointer';
  tipBtn.style.fontSize = '12px';
  tipBtn.style.transition = 'all 0.2s ease';

  tipBtn.addEventListener('mouseenter', () => {
    tipBtn.style.background = 'rgba(244, 208, 63, 0.35)';
  });
  tipBtn.addEventListener('mouseleave', () => {
    tipBtn.style.background = 'rgba(244, 208, 63, 0.2)';
  });
  tipBtn.addEventListener('mousedown', () => {
    tipBtn.style.transform = 'scale(0.95)';
  });
  tipBtn.addEventListener('mouseup', () => {
    tipBtn.style.transform = 'scale(1.0)';
  });

  tipContainer.appendChild(tipText);
  tipContainer.appendChild(tipBtn);

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'timeline-scroll';
  scrollContainer.style.flex = '1';
  scrollContainer.style.overflowX = 'auto';
  scrollContainer.style.overflowY = 'hidden';
  scrollContainer.style.padding = '30px 20px 40px';
  scrollContainer.style.position = 'relative';

  const track = document.createElement('div');
  track.className = 'timeline-track';
  track.style.display = 'flex';
  track.style.alignItems = 'flex-start';
  track.style.gap = '12px';
  track.style.minHeight = '120px';
  track.style.position = 'relative';

  const connectionCanvas = document.createElement('canvas');
  connectionCanvas.className = 'connection-canvas';
  connectionCanvas.style.position = 'absolute';
  connectionCanvas.style.top = '0';
  connectionCanvas.style.left = '0';
  connectionCanvas.style.pointerEvents = 'none';

  scrollContainer.appendChild(track);
  scrollContainer.appendChild(connectionCanvas);

  container.appendChild(header);
  container.appendChild(tipContainer);
  container.appendChild(scrollContainer);

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let modalOverlay: HTMLDivElement | null = null;

  function createDot(record: ScentRecord): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'scent-dot-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';
    wrapper.style.flexShrink = '0';
    wrapper.dataset.recordId = record.id;

    const dotContainer = document.createElement('div');
    dotContainer.style.position = 'relative';
    dotContainer.style.width = '50px';
    dotContainer.style.height = '50px';
    dotContainer.style.display = 'flex';
    dotContainer.style.alignItems = 'center';
    dotContainer.style.justifyContent = 'center';

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 80 * window.devicePixelRatio;
    glowCanvas.height = 80 * window.devicePixelRatio;
    glowCanvas.style.width = '80px';
    glowCanvas.style.height = '80px';
    glowCanvas.style.position = 'absolute';
    glowCanvas.style.top = '50%';
    glowCanvas.style.left = '50%';
    glowCanvas.style.transform = 'translate(-50%, -50%)';
    glowCanvas.style.pointerEvents = 'none';
    glowCanvas.style.opacity = '0';
    glowCanvas.style.transition = 'opacity 0.3s ease';
    const glowCtx = glowCanvas.getContext('2d')!;
    glowCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const dot = document.createElement('div');
    dot.className = 'scent-dot';
    dot.style.width = '30px';
    dot.style.height = '30px';
    dot.style.borderRadius = '50%';
    dot.style.background = record.color;
    dot.style.opacity = '0.75';
    dot.style.cursor = 'pointer';
    dot.style.transition = 'all 0.2s ease';
    dot.style.boxShadow = `0 2px 8px ${record.color}55`;
    dot.style.zIndex = '1';

    if (record.note || record.imageDataUrl) {
      glowCanvas.style.opacity = '1';
      drawGlow(glowCtx, 40, 40, record.color, 15, 40);
    }

    dotContainer.appendChild(glowCanvas);
    dotContainer.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = record.descriptorName;
    label.style.fontSize = '11px';
    label.style.color = '#A0A0B0';
    label.style.maxWidth = '60px';
    label.style.textAlign = 'center';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';

    wrapper.appendChild(dotContainer);
    wrapper.appendChild(label);

    dot.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      dot.style.transform = 'scale(1.1)';
    });
    dot.addEventListener('mouseleave', () => {
      dot.style.opacity = '0.75';
      dot.style.transform = 'scale(1)';
    });

    dot.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dot.style.transform = 'scale(0.95)';
      longPressTimer = setTimeout(() => {
        openModal(record);
      }, 500);
    });
    dot.addEventListener('mouseup', () => {
      dot.style.transform = 'scale(1)';
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
    dot.addEventListener('mouseleave', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
    dot.addEventListener('click', () => {
      openModal(record, true);
    });

    track.appendChild(wrapper);
    dotMap.set(record.id, { element: wrapper, glowCanvas });

    setTimeout(() => {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth;
    }, 50);
  }

  function openModal(record: ScentRecord, viewOnly: boolean = false): void {
    if (modalOverlay) return;

    modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.right = '0';
    modalOverlay.style.bottom = '0';
    modalOverlay.style.background = 'rgba(27, 27, 47, 0.7)';
    modalOverlay.style.backdropFilter = 'blur(10px)';
    (modalOverlay.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = 'blur(10px)';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.opacity = '0';
    modalOverlay.style.transition = 'opacity 0.3s ease';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.style.background = '#2A2A40';
    modal.style.borderRadius = '20px';
    modal.style.padding = '32px';
    modal.style.minWidth = '400px';
    modal.style.maxWidth = '500px';
    modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
    modal.style.transform = 'scale(0.9)';
    modal.style.transition = 'transform 0.3s ease';

    const pathDisplay = document.createElement('div');
    pathDisplay.style.display = 'flex';
    pathDisplay.style.alignItems = 'center';
    pathDisplay.style.gap = '8px';
    pathDisplay.style.marginBottom = '24px';
    pathDisplay.style.flexWrap = 'wrap';

    const pathParts = [
      { name: record.categoryName, color: record.color },
      { name: record.subCategoryName, color: record.color },
      { name: record.descriptorName, color: record.color }
    ];

    pathParts.forEach((part, idx) => {
      const chip = document.createElement('span');
      chip.textContent = part.name;
      chip.style.padding = '6px 14px';
      chip.style.borderRadius = '20px';
      chip.style.background = `${part.color}33`;
      chip.style.color = part.color;
      chip.style.fontSize = '13px';
      chip.style.border = `1px solid ${part.color}55`;
      pathDisplay.appendChild(chip);

      if (idx < pathParts.length - 1) {
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.style.color = '#A0A0B0';
        pathDisplay.appendChild(arrow);
      }
    });

    modal.appendChild(pathDisplay);

    const noteLabel = document.createElement('label');
    noteLabel.textContent = '气味笔记';
    noteLabel.style.display = 'block';
    noteLabel.style.fontSize = '14px';
    noteLabel.style.color = '#EAEAEA';
    noteLabel.style.marginBottom = '8px';

    const noteInput = document.createElement('textarea');
    noteInput.value = record.note || '';
    noteInput.placeholder = '记录这段气味带给你的感受和回忆...';
    noteInput.rows = 4;
    noteInput.maxLength = 200;
    noteInput.style.width = '100%';
    noteInput.style.boxSizing = 'border-box';
    noteInput.style.padding = '12px';
    noteInput.style.borderRadius = '8px';
    noteInput.style.border = '1px solid rgba(255,255,255,0.1)';
    noteInput.style.background = '#1B1B2F';
    noteInput.style.color = '#EAEAEA';
    noteInput.style.fontSize = '13px';
    noteInput.style.fontFamily = 'inherit';
    noteInput.style.resize = 'none';
    noteInput.style.outline = 'none';
    if (viewOnly) noteInput.disabled = true;

    noteInput.addEventListener('focus', () => {
      noteInput.style.borderColor = `${record.color}88`;
    });
    noteInput.addEventListener('blur', () => {
      noteInput.style.borderColor = 'rgba(255,255,255,0.1)';
    });

    const charCount = document.createElement('div');
    charCount.textContent = `${noteInput.value.length}/200`;
    charCount.style.textAlign = 'right';
    charCount.style.fontSize = '11px';
    charCount.style.color = '#A0A0B0';
    charCount.style.marginTop = '4px';
    noteInput.addEventListener('input', () => {
      charCount.textContent = `${noteInput.value.length}/200`;
    });

    modal.appendChild(noteLabel);
    modal.appendChild(noteInput);
    modal.appendChild(charCount);

    const imageLabel = document.createElement('label');
    imageLabel.textContent = '参考图片';
    imageLabel.style.display = 'block';
    imageLabel.style.fontSize = '14px';
    imageLabel.style.color = '#EAEAEA';
    imageLabel.style.marginTop = '20px';
    imageLabel.style.marginBottom = '8px';

    const imageDropZone = document.createElement('div');
    imageDropZone.style.width = '100%';
    imageDropZone.style.height = '150px';
    imageDropZone.style.borderRadius = '8px';
    imageDropZone.style.border = '2px dashed rgba(255,255,255,0.2)';
    imageDropZone.style.display = 'flex';
    imageDropZone.style.alignItems = 'center';
    imageDropZone.style.justifyContent = 'center';
    imageDropZone.style.background = 'rgba(27, 27, 47, 0.5)';
    imageDropZone.style.position = 'relative';
    imageDropZone.style.overflow = 'hidden';
    imageDropZone.style.cursor = viewOnly ? 'default' : 'pointer';

    const previewImg = document.createElement('img');
    previewImg.style.maxWidth = '100%';
    previewImg.style.maxHeight = '100%';
    previewImg.style.objectFit = 'contain';
    previewImg.style.display = 'none';

    const dropHint = document.createElement('span');
    dropHint.textContent = viewOnly ? '无图片' : '拖拽图片到此处或点击上传';
    dropHint.style.color = '#A0A0B0';
    dropHint.style.fontSize = '12px';

    if (record.imageDataUrl) {
      previewImg.src = record.imageDataUrl;
      previewImg.style.display = 'block';
      dropHint.style.display = 'none';
    }

    imageDropZone.appendChild(previewImg);
    imageDropZone.appendChild(dropHint);

    if (!viewOnly) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';

      imageDropZone.addEventListener('click', () => fileInput.click());

      imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.style.borderColor = record.color;
        imageDropZone.style.background = `${record.color}11`;
      });
      imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.style.borderColor = 'rgba(255,255,255,0.2)';
        imageDropZone.style.background = 'rgba(27, 27, 47, 0.5)';
      });
      imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.style.borderColor = 'rgba(255,255,255,0.2)';
        imageDropZone.style.background = 'rgba(27, 27, 47, 0.5)';
        const file = e.dataTransfer?.files[0];
        if (file && file.type.startsWith('image/')) {
          readImageFile(file);
        }
      });

      fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) readImageFile(file);
      });

      function readImageFile(file: File): void {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          previewImg.src = dataUrl;
          previewImg.style.display = 'block';
          dropHint.style.display = 'none';
          previewImg.dataset.url = dataUrl;
        };
        reader.readAsDataURL(file);
      }

      modal.appendChild(fileInput);
    }

    modal.appendChild(imageLabel);
    modal.appendChild(imageDropZone);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '12px';
    btnRow.style.marginTop = '24px';
    btnRow.style.justifyContent = 'flex-end';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = viewOnly ? '关闭' : '取消';
    closeBtn.style.padding = '10px 24px';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.border = '1px solid rgba(255,255,255,0.2)';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#EAEAEA';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '13px';
    closeBtn.style.transition = 'all 0.2s ease';
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
    });
    closeBtn.addEventListener('mousedown', () => {
      closeBtn.style.transform = 'scale(0.95)';
    });
    closeBtn.addEventListener('mouseup', () => {
      closeBtn.style.transform = 'scale(1.0)';
    });
    closeBtn.addEventListener('click', closeModal);

    btnRow.appendChild(closeBtn);

    if (!viewOnly) {
      const saveBtn = document.createElement('button');
      saveBtn.textContent = '保存';
      saveBtn.style.padding = '10px 24px';
      saveBtn.style.borderRadius = '8px';
      saveBtn.style.border = 'none';
      saveBtn.style.background = record.color;
      saveBtn.style.color = '#fff';
      saveBtn.style.cursor = 'pointer';
      saveBtn.style.fontSize = '13px';
      saveBtn.style.fontWeight = '600';
      saveBtn.style.transition = 'all 0.2s ease';
      saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.filter = 'brightness(1.1)';
      });
      saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.filter = 'brightness(1)';
      });
      saveBtn.addEventListener('mousedown', () => {
        saveBtn.style.transform = 'scale(0.95)';
      });
      saveBtn.addEventListener('mouseup', () => {
        saveBtn.style.transform = 'scale(1.0)';
      });
      saveBtn.addEventListener('click', () => {
        const newNote = noteInput.value.trim() || undefined;
        const newImage = previewImg.dataset.url || record.imageDataUrl;

        const targetRecord = records.find(r => r.id === record.id);
        if (targetRecord) {
          targetRecord.note = newNote;
          targetRecord.imageDataUrl = newImage;

          if ((newNote || newImage) && dotMap.has(record.id)) {
            const { glowCanvas } = dotMap.get(record.id)!;
            if (glowCanvas) {
              glowCanvas.style.opacity = '1';
              const gCtx = glowCanvas.getContext('2d')!;
              gCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
              drawGlow(gCtx, 40, 40, record.color, 15, 40);
            }
          }
        }
        closeModal();
      });
      btnRow.appendChild(saveBtn);
    }

    modal.appendChild(btnRow);
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    requestAnimationFrame(() => {
      if (modalOverlay) {
        modalOverlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      }
    });

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  function closeModal(): void {
    if (!modalOverlay) return;
    const overlay = modalOverlay;
    const content = overlay.querySelector('.modal-content') as HTMLElement;

    overlay.style.opacity = '0';
    if (content) content.style.transform = 'scale(0.9)';

    setTimeout(() => {
      overlay.remove();
      modalOverlay = null;
    }, 300);
  }

  function updateConnectionCanvas(): void {
    connectionCanvas.width = track.offsetWidth * window.devicePixelRatio;
    connectionCanvas.height = track.offsetHeight * window.devicePixelRatio;
    connectionCanvas.style.width = track.offsetWidth + 'px';
    connectionCanvas.style.height = track.offsetHeight + 'px';
  }

  function drawConnections(matchedIds: string[]): void {
    updateConnectionCanvas();
    const ctx = connectionCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, connectionCanvas.width, connectionCanvas.height);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (matchedIds.length < 2) return;

    const orderedRecords = records.filter(r => matchedIds.includes(r.id));

    ctx.beginPath();
    ctx.strokeStyle = '#F4D03F';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    orderedRecords.forEach((rec, idx) => {
      const dotData = dotMap.get(rec.id);
      if (!dotData) return;
      const el = dotData.element;
      const rect = el.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const x = rect.left - trackRect.left + rect.width / 2;
      const y = rect.top - trackRect.top + 25;

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);
  }

  function highlightDots(ids: string[]): void {
    clearHighlights();
    ids.forEach((id, idx) => {
      const data = dotMap.get(id);
      if (!data) return;
      const dot = data.element.querySelector('.scent-dot') as HTMLElement;
      if (dot) {
        setTimeout(() => {
          dot.style.animation = 'none';
          dot.offsetHeight;
          dot.style.animation = 'pulse-highlight 0.3s ease-in-out 3';
        }, idx * 50);
      }
    });
  }

  function searchAndHighlight(query: string): ScentRecord[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      clearHighlights();
      return [];
    }

    const matched: ScentRecord[] = [];
    const matchedIds: string[] = [];

    for (const r of records) {
      const inName = [
        r.categoryName, r.subCategoryName, r.descriptorName
      ].some(n => n.toLowerCase().includes(q));
      const inNote = r.note?.toLowerCase().includes(q) ?? false;

      if (inName || inNote) {
        matched.push(r);
        matchedIds.push(r.id);
      }
    }

    highlightDots(matchedIds);
    drawConnections(matchedIds);

    return matched;
  }

  function clearHighlights(): void {
    dotMap.forEach(({ element }) => {
      const dot = element.querySelector('.scent-dot') as HTMLElement;
      if (dot) dot.style.animation = '';
    });
    const ctx = connectionCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, connectionCanvas.width, connectionCanvas.height);
  }

  function showNoResultTip(show: boolean, onAddClick?: () => void): void {
    if (show) {
      tipContainer.style.display = 'flex';
      tipContainer.style.alignItems = 'center';
      requestAnimationFrame(() => {
        tipContainer.style.opacity = '1';
      });
      if (onAddClick) {
        tipBtn.onclick = onAddClick;
      }
    } else {
      tipContainer.style.opacity = '0';
      setTimeout(() => {
        tipContainer.style.display = 'none';
      }, 200);
    }
  }

  scrollContainer.addEventListener('scroll', () => {
    const ctx = connectionCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, connectionCanvas.width, connectionCanvas.height);
  });

  return {
    addRecord: (record) => {
      records.push(record);
      createDot(record);
    },
    updateRecord: (id, data) => {
      const idx = records.findIndex(r => r.id === id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...data };
      }
    },
    searchAndHighlight,
    clearHighlights,
    getRecords: () => [...records],
    showNoResultTip,
    destroy: () => {
      container.innerHTML = '';
      records.length = 0;
      dotMap.clear();
    }
  };
}
