import p5 from 'p5';

export class UI {
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  sliderMin: number;
  sliderMax: number;
  sliderValue: number;
  sliderWidth: number;
  sliderX: number;
  sliderY: number;
  buttonX: number;
  buttonY: number;
  buttonWidth: number;
  buttonHeight: number;
  isHovering: boolean;
  isDraggingSlider: boolean;
  resetClicked: boolean;
  transitionAlpha: number;

  constructor() {
    this.panelWidth = 120;
    this.panelHeight = 80;
    this.sliderMin = 50;
    this.sliderMax = 200;
    this.sliderValue = 100;
    this.sliderWidth = 80;
    this.isHovering = false;
    this.isDraggingSlider = false;
    this.resetClicked = false;
    this.transitionAlpha = 0.6;
    this.panelX = 0;
    this.panelY = 0;
    this.sliderX = 0;
    this.sliderY = 0;
    this.buttonX = 0;
    this.buttonY = 0;
    this.buttonWidth = 60;
    this.buttonHeight = 24;
  }

  updatePosition(p: p5): void {
    this.panelX = p.width - this.panelWidth - 20;
    this.panelY = p.height - this.panelHeight - 20;
    this.sliderX = this.panelX + (this.panelWidth - this.sliderWidth) / 2;
    this.sliderY = this.panelY + 28;
    this.buttonX = this.panelX + (this.panelWidth - this.buttonWidth) / 2;
    this.buttonY = this.panelY + 48;
  }

  handleMouseMove(p: p5): void {
    const onPanel = this.isOnPanel(p.mouseX, p.mouseY);
    this.isHovering = onPanel;
    this.transitionAlpha += ((onPanel ? 0.9 : 0.6) - this.transitionAlpha) * 0.1;
  }

  handleMousePressed(p: p5): void {
    if (this.isOnSlider(p.mouseX, p.mouseY)) {
      this.isDraggingSlider = true;
      this.updateSliderValue(p.mouseX);
    } else if (this.isOnButton(p.mouseX, p.mouseY)) {
      this.resetClicked = true;
    }
  }

  handleMouseDragged(p: p5): void {
    if (this.isDraggingSlider) {
      this.updateSliderValue(p.mouseX);
    }
  }

  handleMouseReleased(): void {
    this.isDraggingSlider = false;
  }

  isOnPanel(mx: number, my: number): boolean {
    return mx >= this.panelX && mx <= this.panelX + this.panelWidth &&
           my >= this.panelY && my <= this.panelY + this.panelHeight;
  }

  isOnSlider(mx: number, my: number): boolean {
    const sliderHandleX = this.sliderX + ((this.sliderValue - this.sliderMin) / (this.sliderMax - this.sliderMin)) * this.sliderWidth;
    return mx >= this.sliderX - 5 && mx <= this.sliderX + this.sliderWidth + 5 &&
           my >= this.sliderY - 8 && my <= this.sliderY + 8;
  }

  isOnButton(mx: number, my: number): boolean {
    return mx >= this.buttonX && mx <= this.buttonX + this.buttonWidth &&
           my >= this.buttonY && my <= this.buttonY + this.buttonHeight;
  }

  consumeReset(): boolean {
    const wasClicked = this.resetClicked;
    this.resetClicked = false;
    return wasClicked;
  }

  getLifespan(): number {
    return this.sliderValue;
  }

  private updateSliderValue(mx: number): void {
    const ratio = (mx - this.sliderX) / this.sliderWidth;
    const clamped = Math.max(0, Math.min(1, ratio));
    this.sliderValue = Math.round(this.sliderMin + clamped * (this.sliderMax - this.sliderMin));
  }

  display(p: p5): void {
    p.push();

    const bgR = 20;
    const bgG = 20;
    const bgB = 40;
    const bgA = Math.floor(this.transitionAlpha * 255);
    p.noStroke();
    p.fill(bgR, bgG, bgB, bgA);
    p.rect(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 8);

    p.fill(255, 255, 255, bgA);
    p.textSize(11);
    p.textAlign(p.CENTER, p.TOP);
    p.text('粒子寿命', this.panelX + this.panelWidth / 2, this.panelY + 8);

    p.noStroke();
    p.fill(68, 85, 102, bgA);
    p.rect(this.sliderX, this.sliderY - 2, this.sliderWidth, 4, 2);

    const handleX = this.sliderX + ((this.sliderValue - this.sliderMin) / (this.sliderMax - this.sliderMin)) * this.sliderWidth;
    p.fill(136, 170, 221, 255);
    p.ellipse(handleX, this.sliderY, 12, 12);

    p.fill(255, 255, 255, bgA);
    p.textSize(10);
    p.textAlign(p.CENTER, p.TOP);
    p.text(String(this.sliderValue), this.panelX + this.panelWidth / 2, this.sliderY + 6);

    p.fill(85, 68, 102, 255);
    p.rect(this.buttonX, this.buttonY, this.buttonWidth, this.buttonHeight, 4);
    p.fill(255, 255, 255, 255);
    p.textSize(12);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('清空', this.buttonX + this.buttonWidth / 2, this.buttonY + this.buttonHeight / 2);

    p.pop();
  }
}
