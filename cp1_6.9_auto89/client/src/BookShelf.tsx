import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BookCard, BookData } from './BookCard';

const SHELF_COUNT = 5;
const BOOKS_PER_SHELF = 10;
const SHELF_WIDTH = 260;
const SHELF_HEIGHT = 6;
const SHELF_DEPTH = 30;
const SHELF_SPACING = 65;
const BOOK_WIDTH = 20;
const BOOK_THICKNESS = 10;
const BOOK_GAP = 4;

export interface ShelfAPI {
  addBook: (data: BookData, animate?: boolean) => void;
  removeBook: (id: string) => void;
  onBookClick: (callback: (bookId: string) => void) => void;
  resize: () => void;
  dispose: () => void;
  getBookData: (id: string) => BookData | undefined;
  updateBook: (id: string, updates: Partial<BookData>) => void;
}

export function initShelf(container: HTMLElement): ShelfAPI {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 300, 600);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 20, 280);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 150;
  controls.maxDistance = 450;
  controls.maxPolarAngle = Math.PI / 2 + 0.2;
  controls.minPolarAngle = Math.PI / 4;
  controls.target.set(0, 80, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(100, 200, 100);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 500;
  mainLight.shadow.camera.left = -200;
  mainLight.shadow.camera.right = 200;
  mainLight.shadow.camera.top = 200;
  mainLight.shadow.camera.bottom = -200;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.3);
  fillLight.position.set(-100, 100, -100);
  scene.add(fillLight);

  const shelfGroup = new THREE.Group();
  scene.add(shelfGroup);

  function createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, '#9a6b3c');
    gradient.addColorStop(0.5, '#8B5A2B');
    gradient.addColorStop(1, '#7a4d23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 64);
    
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 64, 1, 1);
    }
    
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.15})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * 64);
      for (let x = 0; x < 512; x += 10) {
        ctx.lineTo(x, Math.random() * 64);
      }
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  const woodTexture = createWoodTexture();
  const woodMaterial = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.8,
    metalness: 0.05
  });

  function createShelf(): void {
    const sidePanelGeometry = new THREE.BoxGeometry(SHELF_DEPTH, SHELF_SPACING * SHELF_COUNT + 40, 3);
    const sidePanelMaterial = woodMaterial;
    
    const leftPanel = new THREE.Mesh(sidePanelGeometry, sidePanelMaterial);
    leftPanel.position.set(-SHELF_WIDTH / 2 - 1.5, SHELF_SPACING * SHELF_COUNT / 2, 0);
    leftPanel.castShadow = true;
    leftPanel.receiveShadow = true;
    shelfGroup.add(leftPanel);
    
    const rightPanel = new THREE.Mesh(sidePanelGeometry, sidePanelMaterial);
    rightPanel.position.set(SHELF_WIDTH / 2 + 1.5, SHELF_SPACING * SHELF_COUNT / 2, 0);
    rightPanel.castShadow = true;
    rightPanel.receiveShadow = true;
    shelfGroup.add(rightPanel);
    
    const backPanelGeometry = new THREE.BoxGeometry(SHELF_WIDTH, SHELF_SPACING * SHELF_COUNT + 40, 2);
    const backPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.9
    });
    const backPanel = new THREE.Mesh(backPanelGeometry, backPanelMaterial);
    backPanel.position.set(0, SHELF_SPACING * SHELF_COUNT / 2, -SHELF_DEPTH / 2 - 1);
    backPanel.receiveShadow = true;
    shelfGroup.add(backPanel);

    const shelfGeometry = new THREE.BoxGeometry(SHELF_WIDTH + 6, SHELF_HEIGHT, SHELF_DEPTH);
    
    for (let i = 0; i <= SHELF_COUNT; i++) {
      const shelf = new THREE.Mesh(shelfGeometry, woodMaterial);
      shelf.position.set(0, i * SHELF_SPACING, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      shelfGroup.add(shelf);
    }
  }

  createShelf();

  const books: Map<string, BookCard> = new Map();
  let bookClickCallback: ((bookId: string) => void) | null = null;

  function getBookPosition(shelf: number, position: number): THREE.Vector3 {
    const startX = -SHELF_WIDTH / 2 + BOOK_WIDTH / 2 + 15;
    const x = startX + position * (BOOK_WIDTH + BOOK_GAP);
    const y = shelf * SHELF_SPACING + SHELF_HEIGHT / 2 + 2;
    const z = 0;
    return new THREE.Vector3(x, y, z);
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredBook: BookCard | null = null;

  function onMouseMove(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const bookMeshes = Array.from(books.values()).map(b => b.mesh);
    const intersects = raycaster.intersectObjects(bookMeshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.isBook) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.bookId && bookClickCallback) {
        bookClickCallback(obj.userData.bookId);
      }
    }
  }

  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onClick);

  let animationFrameId: number;

  function animate(): void {
    animationFrameId = requestAnimationFrame(animate);
    
    raycaster.setFromCamera(mouse, camera);
    const bookMeshes = Array.from(books.values()).map(b => b.mesh);
    const intersects = raycaster.intersectObjects(bookMeshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.isBook) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.bookId) {
        const book = books.get(obj.userData.bookId);
        if (book && hoveredBook !== book) {
          if (hoveredBook) hoveredBook.highlight(false);
          book.highlight(true);
          hoveredBook = book;
          renderer.domElement.style.cursor = 'pointer';
        }
      }
    } else if (hoveredBook) {
      hoveredBook.highlight(false);
      hoveredBook = null;
      renderer.domElement.style.cursor = 'grab';
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  function handleResize(): void {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener('resize', handleResize);

  return {
    addBook(data: BookData, animate: boolean = true): void {
      if (books.has(data.id)) return;
      
      const book = new BookCard(data);
      const pos = getBookPosition(data.shelf, data.position);
      
      if (animate) {
        book.setPosition(pos.x, pos.y, pos.z - 300);
        shelfGroup.add(book.mesh);
        book.flyTo(pos.x, pos.y, pos.z, 300);
      } else {
        book.setPosition(pos.x, pos.y, pos.z);
        shelfGroup.add(book.mesh);
        book.fadeIn(500);
      }
      
      books.set(data.id, book);
    },

    removeBook(id: string): void {
      const book = books.get(id);
      if (book) {
        shelfGroup.remove(book.mesh);
        books.delete(id);
      }
    },

    onBookClick(callback: (bookId: string) => void): void {
      bookClickCallback = callback;
    },

    resize(): void {
      handleResize();
    },

    dispose(): void {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },

    getBookData(id: string): BookData | undefined {
      return books.get(id)?.data;
    },

    updateBook(id: string, updates: Partial<BookData>): void {
      const book = books.get(id);
      if (book) {
        Object.assign(book.data, updates);
      }
    }
  };
}
