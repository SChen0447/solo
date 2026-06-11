import Phaser from 'phaser';
import { Plant, Genotype, getPhenotype } from './geneManager';

export function generatePotGraphics(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  
  const potTop = height * 0.6;
  const potBottom = height;
  const potTopWidth = width * 0.9;
  const potBottomWidth = width * 0.7;
  
  graphics.fillGradientStyle(0xa0522d, 0xa0522d, 0x8b4513, 0x8b4513, 1);
  graphics.beginPath();
  graphics.moveTo((width - potTopWidth) / 2, potTop);
  graphics.lineTo((width + potTopWidth) / 2, potTop);
  graphics.lineTo((width + potBottomWidth) / 2, potBottom);
  graphics.lineTo((width - potBottomWidth) / 2, potBottom);
  graphics.closePath();
  graphics.fill();
  
  graphics.fillStyle(0x5c4033);
  graphics.fillEllipse(width / 2, potTop, potTopWidth * 0.9, 8);
  
  graphics.fillStyle(0x3e2723, 0.3);
  graphics.fillRect((width - potTopWidth) / 2, potTop, potTopWidth, 5);
  
  return graphics;
}

export function generateLeafGraphics(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  leafShape: 'wide' | 'narrow',
  rotation: number = 0
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  
  const leafWidth = leafShape === 'wide' ? width * 0.8 : width * 0.5;
  const leafHeight = height;
  
  const greenVariation = Math.random();
  const greenStart = Phaser.Display.Color.HexStringToColor('#aed581').color;
  const greenEnd = Phaser.Display.Color.HexStringToColor('#2e7d32').color;
  const leafColor = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(greenStart),
    Phaser.Display.Color.ValueToColor(greenEnd),
    100,
    Math.floor(greenVariation * 100)
  );
  
  graphics.fillStyle(Phaser.Display.Color.GetColor(leafColor.r, leafColor.g, leafColor.b));
  
  const startX = x;
  const startY = y;
  const cp1x = x - leafWidth / 2;
  const cp1y = y - leafHeight / 3;
  const cp2x = x - leafWidth / 3;
  const cp2y = y - leafHeight * 0.8;
  const tipX = x;
  const tipY = y - leafHeight;
  const cp3x = x + leafWidth / 3;
  const cp3y = y - leafHeight * 0.8;
  const cp4x = x + leafWidth / 2;
  const cp4y = y - leafHeight / 3;
  
  const curve1 = new Phaser.Curves.CubicBezier(
    new Phaser.Math.Vector2(startX, startY),
    new Phaser.Math.Vector2(cp1x, cp1y),
    new Phaser.Math.Vector2(cp2x, cp2y),
    new Phaser.Math.Vector2(tipX, tipY)
  );
  
  const curve2 = new Phaser.Curves.CubicBezier(
    new Phaser.Math.Vector2(tipX, tipY),
    new Phaser.Math.Vector2(cp3x, cp3y),
    new Phaser.Math.Vector2(cp4x, cp4y),
    new Phaser.Math.Vector2(startX, startY)
  );
  
  const path = new Phaser.Curves.Path(startX, startY);
  path.add(curve1);
  path.add(curve2);
  path.closePath();
  
  path.draw(graphics);
  graphics.fillPath();
  
  graphics.lineStyle(1.5, 0x1b5e20, 0.5);
  graphics.beginPath();
  graphics.moveTo(startX, startY - 2);
  graphics.lineTo(tipX, tipY + 2);
  graphics.stroke();
  
  graphics.setRotation(rotation);
  
  return graphics;
}

export function generateFlowerGraphics(
  scene: Phaser.Scene,
  x: number,
  y: number,
  petalColor: string,
  size: number = 20
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const colorNum = Phaser.Display.Color.HexStringToColor(petalColor).color;
  const petalCount = 5;
  
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petalX = x + Math.cos(angle) * size * 0.5;
    const petalY = y + Math.sin(angle) * size * 0.5;
    
    graphics.fillStyle(colorNum, 0.9);
    graphics.beginPath();
    graphics.fillEllipse(petalX, petalY, size * 0.5, size * 0.35, angle);
    graphics.fill();
  }
  
  graphics.fillStyle(0xffeb3b, 1);
  graphics.beginPath();
  graphics.arc(x, y, size * 0.25, 0, Math.PI * 2);
  graphics.fill();
  
  graphics.fillStyle(0xffc107, 0.8);
  graphics.beginPath();
  graphics.arc(x, y, size * 0.15, 0, Math.PI * 2);
  graphics.fill();
  
  return graphics;
}

export function generatePlantSprite(
  scene: Phaser.Scene,
  plant: Plant,
  x: number,
  y: number,
  width: number = 120,
  height: number = 160,
  growthStage: number = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  
  const pot = generatePotGraphics(scene, width, height);
  container.add(pot);
  
  const phenotype = getPhenotype(plant.genotype);
  
  const baseLeafCount = growthStage === 1 ? 2 : 
                       growthStage === 2 ? 4 : 
                       growthStage === 3 ? Math.floor(Math.random() * 2) + 5 :
                       Math.floor(Math.random() * 3) + 5;
  
  const leafCount = Math.min(baseLeafCount, growthStage === 4 ? 8 : baseLeafCount);
  const stemHeight = Math.min(height * 0.5, height * 0.15 * growthStage);
  
  const stemGraphics = scene.add.graphics();
  stemGraphics.lineStyle(3, 0x558b2f);
  stemGraphics.beginPath();
  stemGraphics.moveTo(width / 2, height * 0.6);
  stemGraphics.lineTo(width / 2, height * 0.6 - stemHeight);
  stemGraphics.stroke();
  container.add(stemGraphics);
  
  const leafSize = growthStage === 1 ? 15 : 
                   growthStage === 2 ? 22 : 
                   growthStage === 3 ? 28 : 32;
  const leafHeight = leafSize * 1.5;
  
  for (let i = 0; i < leafCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const leafY = height * 0.6 - (stemHeight * (0.3 + (i / leafCount) * 0.6));
    const leafX = width / 2 + side * 8;
    const rotation = side * (0.3 + Math.random() * 0.3);
    
    const leaf = generateLeafGraphics(
      scene,
      leafX,
      leafY,
      leafSize,
      leafHeight,
      phenotype.leafShape,
      rotation
    );
    container.add(leaf);
  }
  
  if (growthStage >= 3) {
    const flowerSize = growthStage === 3 ? 12 : 18;
    const flower = generateFlowerGraphics(
      scene,
      width / 2,
      height * 0.6 - stemHeight - 5,
      phenotype.petalColor,
      flowerSize
    );
    container.add(flower);
  }
  
  container.setSize(width, height);
  return container;
}

export function generateGardenPlantSprite(
  scene: Phaser.Scene,
  plant: Plant,
  x: number,
  y: number,
  width: number = 150,
  height: number = 200
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  
  const pot = generatePotGraphics(scene, width, height);
  container.add(pot);
  
  const phenotype = getPhenotype(plant.genotype);
  
  const leafCount = Math.floor(Math.random() * 5) + 3;
  const stemHeight = height * 0.5;
  
  const stemGraphics = scene.add.graphics();
  stemGraphics.lineStyle(3, 0x558b2f);
  stemGraphics.beginPath();
  stemGraphics.moveTo(width / 2, height * 0.6);
  stemGraphics.lineTo(width / 2, height * 0.6 - stemHeight);
  stemGraphics.stroke();
  container.add(stemGraphics);
  
  const leafSize = phenotype.leafShape === 'wide' ? 35 : 22;
  const leafHeight = leafSize * 1.5;
  
  for (let i = 0; i < leafCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const leafY = height * 0.6 - (stemHeight * (0.2 + (i / leafCount) * 0.7));
    const leafX = width / 2 + side * 10;
    const rotation = side * (0.25 + Math.random() * 0.25);
    
    const leaf = generateLeafGraphics(
      scene,
      leafX,
      leafY,
      leafSize,
      leafHeight,
      phenotype.leafShape,
      rotation
    );
    container.add(leaf);
  }
  
  const flower = generateFlowerGraphics(
    scene,
    width / 2,
    height * 0.6 - stemHeight - 10,
    phenotype.petalColor,
    22
  );
  container.add(flower);
  
  container.setSize(width, height);
  return container;
}

export function createGrowthAnimation(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  duration: number = 4000
): Promise<void> {
  return new Promise((resolve) => {
    let stage = 1;
    const startTime = Date.now();
    
    const swayTween = scene.tweens.add({
      targets: container,
      rotation: { from: -0.035, to: 0.035 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    const updateStage = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      let newStage = 1;
      if (progress > 0.75) newStage = 4;
      else if (progress > 0.5) newStage = 3;
      else if (progress > 0.25) newStage = 2;
      
      if (newStage !== stage) {
        stage = newStage;
      }
      
      container.setScale(0.3 + progress * 0.7);
      
      if (progress < 1) {
        requestAnimationFrame(updateStage);
      } else {
        swayTween.stop();
        container.setRotation(0);
        container.setScale(1);
        resolve();
      }
    };
    
    updateStage();
  });
}

export function createBounceAnimation(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject
): void {
  scene.tweens.add({
    targets: target,
    scaleX: { from: 0.95, to: 1.05 },
    scaleY: { from: 0.95, to: 1.05 },
    duration: 200,
    yoyo: true,
    ease: 'Quad.easeOut'
  });
}

export function createHoverAnimation(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  originalScale: number = 1
): void {
  scene.tweens.add({
    targets: target,
    scaleX: originalScale * 1.05,
    scaleY: originalScale * 1.05,
    duration: 150,
    ease: 'Quad.easeOut'
  });
}

export function createLeaveAnimation(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  originalScale: number = 1
): void {
  scene.tweens.add({
    targets: target,
    scaleX: originalScale,
    scaleY: originalScale,
    duration: 150,
    ease: 'Quad.easeOut'
  });
}
