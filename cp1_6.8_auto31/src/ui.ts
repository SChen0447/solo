import { StarSystem } from './stars';
import { ControlSystem, CustomMarker } from './controls';
import { StarData, ConstellationData } from './data/constellations';

export class UISystem {
  private starSystem: StarSystem;
  private controlSystem: ControlSystem;
  private container: HTMLElement;
  private infoCard: HTMLElement;
  private constellationList: HTMLElement;
  constellationPanel: HTMLElement;
  private markersPanel: HTMLElement;
  private markersList: HTMLElement;
  private storyPanel: HTMLElement;
  private storyTitle: HTMLElement;
  private storyContent: HTMLElement;
  private searchInput: HTMLInputElement;
  private autoTourBtn: HTMLElement;
  private resetViewBtn: HTMLElement;
  private togglePanelBtn: HTMLElement;
  private toggleMarkersBtn: HTMLElement;
  private addMarkerBtn: HTMLElement;
  private markerModal: HTMLElement;
  private markerNameInput: HTMLInputElement;
  private markerNoteInput: HTMLTextAreaElement;
  private cancelMarkerBtn: HTMLElement;
  private confirmMarkerBtn: HTMLElement;
  private colorOptions: HTMLElement;
  private selectedColor: string = '#FFD54F';
  private isPanelOpen: boolean = false;
  private isMarkersPanelOpen: boolean = false;
  private currentConstellation: ConstellationData | null = null;

  constructor(starSystem: StarSystem, controlSystem: ControlSystem, container: HTMLElement) {
    this.starSystem = starSystem;
    this.controlSystem = controlSystem;
    this.container = container;

    this.infoCard = document.getElementById('info-card')!;
    this.constellationList = document.getElementById('constellation-list')!;
    this.constellationPanel = document.getElementById('constellation-panel')!;
    this.markersPanel = document.getElementById('markers-panel')!;
    this.markersList = document.getElementById('markers-list')!;
    this.storyPanel = document.getElementById('story-panel')!;
    this.storyTitle = document.getElementById('story-title')!;
    this.storyContent = document.getElementById('story-content')!;
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.autoTourBtn = document.getElementById('auto-tour-btn')!;
    this.resetViewBtn = document.getElementById('reset-view-btn')!;
    this.togglePanelBtn = document.getElementById('toggle-panel-btn')!;
    this.toggleMarkersBtn = document.getElementById('toggle-markers-btn')!;
    this.addMarkerBtn = document.getElementById('add-marker-btn')!;
    this.markerModal = document.getElementById('marker-input-modal')!;
    this.markerNameInput = document.getElementById('marker-name-input') as HTMLInputElement;
    this.markerNoteInput = document.getElementById('marker-note-input') as HTMLTextAreaElement;
    this.cancelMarkerBtn = document.getElementById('cancel-marker-btn')!;
    this.confirmMarkerBtn = document.getElementById('confirm-marker-btn')!;
    this.colorOptions = document.getElementById('color-options')!;

    this.init();
  }

  private init() {
    this.populateConstellationList();
    this.populateMarkersList();
    this.bindEvents();
    this.setupStarHover();
    this.setupConstellationChange();
    this.setupControlEvents();
  }

  private populateConstellationList() {
    const constellations = this.starSystem.getConstellations();
    constellations.sort((a, b) => a.nameCn.localeCompare(b.nameCn, 'zh'));

    this.constellationList.innerHTML = '';
    constellations.forEach(c => {
      const li = document.createElement('li');
      li.textContent = `${c.nameCn} ${c.name}`;
      li.dataset.constellationId = c.id;
      li.addEventListener('click', () => {
        this.controlSystem.flyToConstellation(c.id);
        this.setActiveConstellation(c.id);
      });
      this.constellationList.appendChild(li);
    });
  }

  private populateMarkersList() {
    const markers = this.controlSystem.getMarkers();
    this.markersList.innerHTML = '';

    if (markers.length === 0) {
      const li = document.createElement('li');
      li.style.color = '#666';
      li.style.fontStyle = 'italic';
      li.textContent = '暂无标记，双击星空添加';
      this.markersList.appendChild(li);
      return;
    }

    markers.forEach(marker => {
      const li = document.createElement('li');
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'marker-info';
      infoDiv.addEventListener('click', () => {
        this.controlSystem.flyToMarker(marker.id);
      });

      const nameDiv = document.createElement('div');
      nameDiv.className = 'marker-name';
      nameDiv.style.color = marker.color;
      nameDiv.textContent = marker.name;

      const noteDiv = document.createElement('div');
      noteDiv.className = 'marker-note';
      noteDiv.textContent = marker.note || '无备注';

      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(noteDiv);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'marker-actions';

      const locateBtn = document.createElement('button');
      locateBtn.textContent = '定位';
      locateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.controlSystem.flyToMarker(marker.id);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMarker(marker.id);
      });

      actionsDiv.appendChild(locateBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(infoDiv);
      li.appendChild(actionsDiv);
      this.markersList.appendChild(li);
    });
  }

  private deleteMarker(markerId: string) {
    if (confirm('确定要删除这个标记吗？')) {
      this.controlSystem.deleteMarker(markerId);
    }
  }

  private bindEvents() {
    this.autoTourBtn.addEventListener('click', () => {
      this.controlSystem.toggleAutoTour();
    });

    this.resetViewBtn.addEventListener('click', () => {
      this.controlSystem.resetView();
    });

    this.togglePanelBtn.addEventListener('click', () => {
      this.toggleConstellationPanel();
    });

    this.toggleMarkersBtn.addEventListener('click', () => {
      this.toggleMarkersPanel();
    });

    this.addMarkerBtn.addEventListener('click', () => {
      this.controlSystem.startAddingMarker();
      this.showMarkerModal();
    });

    this.cancelMarkerBtn.addEventListener('click', () => {
      this.hideMarkerModal();
      this.controlSystem.cancelAddingMarker();
    });

    this.confirmMarkerBtn.addEventListener('click', () => {
      this.confirmAddMarker();
    });

    this.searchInput.addEventListener('input', (e) => {
      this.handleSearch((e.target as HTMLInputElement).value);
    });

    this.colorOptions.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-dot')) {
        this.selectColor(target.dataset.color || '#FFD54F');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.controlSystem.getIsAddingMarker()) {
        e.preventDefault();
        this.controlSystem.toggleAutoTour();
      }
      if (e.code === 'Escape') {
        if (this.controlSystem.getIsAddingMarker()) {
          this.hideMarkerModal();
          this.controlSystem.cancelAddingMarker();
        }
        if (this.controlSystem.getIsAutoTour()) {
          this.controlSystem.stopAutoTour();
        }
      }
    });
  }

  private selectColor(color: string) {
    this.selectedColor = color;
    const dots = this.colorOptions.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      dot.classList.remove('selected');
      if ((dot as HTMLElement).dataset.color === color) {
        dot.classList.add('selected');
      }
    });
  }

  private showMarkerModal() {
    this.markerModal.classList.add('visible');
    this.markerNameInput.focus();
  }

  private hideMarkerModal() {
    this.markerModal.classList.remove('visible');
    this.markerNameInput.value = '';
    this.markerNoteInput.value = '';
    this.selectColor('#FFD54F');
  }

  private confirmAddMarker() {
    const name = this.markerNameInput.value.trim();
    const note = this.markerNoteInput.value.trim();

    if (!name) {
      alert('请输入标记名称');
      return;
    }

    this.controlSystem.confirmAddingMarker(name, note, this.selectedColor);
    this.hideMarkerModal();
  }

  private toggleConstellationPanel() {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.constellationPanel.classList.add('open');
      this.togglePanelBtn.textContent = '✕';
    } else {
      this.constellationPanel.classList.remove('open');
      this.togglePanelBtn.textContent = '☰';
    }
  }

  private toggleMarkersPanel() {
    this.isMarkersPanelOpen = !this.isMarkersPanelOpen;
    if (this.isMarkersPanelOpen) {
      this.markersPanel.classList.add('open');
      this.toggleMarkersBtn.textContent = '✕';
    } else {
      this.markersPanel.classList.remove('open');
      this.toggleMarkersBtn.textContent = '⭐';
    }
  }

  private setActiveConstellation(constellationId: string) {
    const items = this.constellationList.querySelectorAll('li');
    items.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.constellationId === constellationId) {
        item.classList.add('active');
      }
    });
  }

  private handleSearch(query: string) {
    const items = this.constellationList.querySelectorAll('li');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
      const text = item.textContent?.toLowerCase() || '';
      if (text.includes(lowerQuery)) {
        (item as HTMLElement).style.display = 'block';
      } else {
        (item as HTMLElement).style.display = 'none';
      }
    });

    if (query) {
      const stars = this.starSystem.getStarData();
      const matchedStar = stars.find(s => 
        s.name.toLowerCase().includes(lowerQuery)
      );
      if (matchedStar) {
        // Could add star highlighting
      }
    }
  }

  private setupStarHover() {
    this.starSystem.onStarHover = (star, screenPos) => {
      if (star) {
        this.showInfoCard(star, screenPos);
      } else {
        this.hideInfoCard();
      }
    };
  }

  private setupConstellationChange() {
    this.starSystem.onConstellationChange = (constellation) => {
      this.updateStoryPanel(constellation);
      this.setActiveConstellation(constellation.id);
    };
  }

  private setupControlEvents() {
    this.controlSystem.onTourStatusChange = (isTouring) => {
      if (isTouring) {
        this.autoTourBtn.classList.add('active');
        this.autoTourBtn.textContent = '⏸ 暂停漫游';
      } else {
        this.autoTourBtn.classList.remove('active');
        this.autoTourBtn.textContent = '🚀 自动漫游';
      }
    };

    this.controlSystem.onMarkersChange = () => {
      this.populateMarkersList();
    };

    this.controlSystem.onAddMarkerRequest = () => {
      this.showMarkerModal();
    };
  }

  private showInfoCard(star: StarData, screenPos: { x: number; y: number }) {
    document.getElementById('card-star-name')!.textContent = star.name;
    document.getElementById('card-constellation')!.textContent = star.constellation;
    document.getElementById('card-distance')!.textContent = `${star.distance} 光年`;
    document.getElementById('card-magnitude')!.textContent = star.magnitude.toFixed(2);
    document.getElementById('card-spectrum')!.textContent = star.spectrum;

    const cardWidth = 200;
    const cardHeight = 150;
    const offsetX = 15;
    const offsetY = -150;

    let left = screenPos.x + offsetX;
    let top = screenPos.y + offsetY;

    if (left + cardWidth > this.container.clientWidth) {
      left = screenPos.x - cardWidth - offsetX;
    }
    if (top < 60) {
      top = screenPos.y + 20;
    }
    if (top + cardHeight > this.container.clientHeight) {
      top = this.container.clientHeight - cardHeight - 10;
    }

    this.infoCard.style.left = `${left}px`;
    this.infoCard.style.top = `${top}px`;
    this.infoCard.classList.add('visible');
  }

  private hideInfoCard() {
    this.infoCard.classList.remove('visible');
  }

  private updateStoryPanel(constellation: ConstellationData) {
    if (this.currentConstellation?.id === constellation.id) return;

    this.storyPanel.classList.add('fading');
    
    setTimeout(() => {
      this.storyTitle.textContent = `${constellation.nameCn} ${constellation.name}`;
      this.storyContent.textContent = constellation.story;
      this.storyPanel.classList.remove('fading');
    }, 300);

    this.currentConstellation = constellation;
  }

  public updateMousePosition(clientX: number, clientY: number) {
    this.starSystem.handleMouseMove(clientX, clientY, this.container);
  }

  public handleCanvasClick(event: MouseEvent) {
    this.controlSystem.handleCanvasClick(event, this.container);
  }

  public handleCanvasDoubleClick(event: MouseEvent) {
    this.controlSystem.handleDoubleClick(event, this.container);
  }

  public hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }
}
