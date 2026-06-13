import * as THREE from 'three';

export class ColorMapper {
  private static readonly HSL_0 = { h: 200 / 360, s: 0.8, l: 0.5 };
  private static readonly HSL_3 = { h: 120 / 360, s: 0.8, l: 0.5 };
  private static readonly HSL_6 = { h: 240 / 360, s: 0.8, l: 0.5 };
  private static readonly HSL_DARK = { h: 0, s: 0, l: 0.2 };
  
  private static readonly INITIAL_COLOR = new THREE.Color().setHSL(280 / 360, 0.6, 0.5);
  
  public static getInitialColor(): THREE.Color {
    return this.INITIAL_COLOR.clone();
  }
  
  public static mapDistanceToColor(distance: number): THREE.Color {
    const color = new THREE.Color();
    
    if (distance <= 0) {
      color.setHSL(this.HSL_0.h, this.HSL_0.s, this.HSL_0.l);
      return color;
    }
    
    if (distance <= 3) {
      const t = distance / 3;
      const h = this.lerp(this.HSL_0.h, this.HSL_3.h, t);
      const s = this.lerp(this.HSL_0.s, this.HSL_3.s, t);
      const l = this.lerp(this.HSL_0.l, this.HSL_3.l, t);
      color.setHSL(h, s, l);
      return color;
    }
    
    if (distance <= 6) {
      const t = (distance - 3) / 3;
      const h = this.lerp(this.HSL_3.h, this.HSL_6.h, t);
      const s = this.lerp(this.HSL_3.s, this.HSL_6.s, t);
      const l = this.lerp(this.HSL_3.l, this.HSL_6.l, t);
      color.setHSL(h, s, l);
      return color;
    }
    
    color.setHSL(this.HSL_DARK.h, this.HSL_DARK.s, this.HSL_DARK.l);
    return color;
  }
  
  public static mapDistanceToScale(distance: number): number {
    if (distance <= 0) {
      return 0.6;
    }
    
    if (distance <= 3) {
      const t = distance / 3;
      return this.lerp(0.6, 0.3, t);
    }
    
    if (distance <= 6) {
      const t = (distance - 3) / 3;
      return this.lerp(0.3, 0.5, t);
    }
    
    return 0.2;
  }
  
  public static mapDistanceToSpinSpeed(distance: number): number {
    if (distance <= 0) {
      return 0.02;
    }
    
    if (distance <= 3) {
      const t = distance / 3;
      return this.lerp(0.08, 0.02, t);
    }
    
    if (distance <= 6) {
      const t = (distance - 3) / 3;
      return this.lerp(0.02, 0.005, t);
    }
    
    return 0;
  }
  
  public static getPulseHighlightColor(): THREE.Color {
    return new THREE.Color().setHSL(50 / 360, 1.0, 0.7);
  }
  
  private static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
