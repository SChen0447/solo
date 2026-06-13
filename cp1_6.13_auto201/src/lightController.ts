export interface LightResult {
  hueShift: number;
  brightnessShift: number;
  specularIntensity: number;
}

export interface LightSource {
  x: number;
  y: number;
  z: number;
}

export class LightController {
  private lightSource: LightSource = { x: 0, y: 0, z: 100 };
  private lightHeight: number = 50;
  private viewRotationY: number = 0;

  public setLightHeight(value: number): void {
    this.lightHeight = Math.max(0, Math.min(100, value));
    this.updateLightSource();
  }

  public setViewRotationY(radians: number): void {
    this.viewRotationY = radians;
    this.updateLightSource();
  }

  public setMousePosition(normX: number, normY: number): void {
    const radius = 150;
    const baseAngle = normX * Math.PI * 2;
    const heightAngle = (1 - normY) * Math.PI;

    this.lightSource.x = Math.sin(baseAngle) * Math.sin(heightAngle) * radius;
    this.lightSource.y = Math.cos(heightAngle) * radius;
    this.lightSource.z = Math.cos(baseAngle) * Math.sin(heightAngle) * radius;
    this.updateLightSource();
  }

  private updateLightSource(): void {
    const heightFactor = (this.lightHeight - 50) / 50;
    this.lightSource.y = 60 + heightFactor * 100;

    const rotCos = Math.cos(this.viewRotationY);
    const rotSin = Math.sin(this.viewRotationY);
    const origX = this.lightSource.x;
    const origZ = this.lightSource.z;

    this.lightSource.x = origX * rotCos - origZ * rotSin;
    this.lightSource.z = origX * rotSin + origZ * rotCos;
  }

  public calculateLight(
    scaleX: number,
    scaleY: number,
    scaleNormalX: number,
    scaleNormalY: number,
    canvasWidth: number,
    canvasHeight: number
  ): LightResult {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const relX = (scaleX - centerX) / (canvasWidth / 2);
    const relY = (scaleY - centerY) / (canvasHeight / 2);

    const depthZ = Math.sin(this.viewRotationY) * relX * 50;
    const scalePosX = (scaleX - centerX) * Math.cos(this.viewRotationY);
    const scalePosY = scaleY - centerY;
    const scalePosZ = depthZ;

    const dx = this.lightSource.x - scalePosX;
    const dy = this.lightSource.y - scalePosY;
    const dz = this.lightSource.z - scalePosZ;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const invDist = 1 / Math.max(distance, 1);

    const lightDirX = dx * invDist;
    const lightDirY = dy * invDist;
    const lightDirZ = dz * invDist;

    const normalZ = 1.0;
    const normalLen = Math.sqrt(
      scaleNormalX * scaleNormalX + scaleNormalY * scaleNormalY + normalZ * normalZ
    );
    const nX = scaleNormalX / normalLen;
    const nY = scaleNormalY / normalLen;
    const nZ = normalZ / normalLen;

    const diffuse = Math.max(0, nX * lightDirX + nY * lightDirY + nZ * lightDirZ);

    const viewDirX = 0;
    const viewDirY = 0;
    const viewDirZ = 1;
    const halfX = (lightDirX + viewDirX) / 2;
    const halfY = (lightDirY + viewDirY) / 2;
    const halfZ = (lightDirZ + viewDirZ) / 2;
    const halfLen = Math.sqrt(halfX * halfX + halfY * halfY + halfZ * halfZ);
    const specular = Math.pow(
      Math.max(0, (nX * halfX + nY * halfY + nZ * halfZ) / Math.max(halfLen, 0.001)),
      32
    );

    const attenuation = Math.max(0.2, 1 - distance / 600);
    const hueShift = (relX * 30 + Math.sin(this.viewRotationY) * 20) * attenuation;
    const brightnessShift = (diffuse * 0.4 - 0.1) * attenuation;

    return {
      hueShift,
      brightnessShift,
      specularIntensity: specular * attenuation * 0.7
    };
  }
}
