import * as THREE from 'three';
import gsap from 'gsap';

export class AuroraEffect {
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  public material: THREE.ShaderMaterial;
  public active: boolean = false;
  public windSpeed: number = 1;
  private sphereRadius: number;
  private time: number = 0;
  private auroraTimer: number = 0;
  private auroraDuration: number = 10;
  private auroraInterval: number = 15;
  private intensity: number = 0;

  constructor(sphereRadius: number) {
    this.sphereRadius = sphereRadius;
    this.group = new THREE.Group();

    const geometry = this.createAuroraGeometry();
    this.material = this.createAuroraMaterial();
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.visible = false;

    this.mesh.position.set(0, this.sphereRadius * 0.8, 0);
    this.mesh.rotation.x = -Math.PI * 0.4;
    this.mesh.scale.set(this.sphereRadius * 1.2, this.sphereRadius * 0.8, 1);

    this.group.add(this.mesh);
  }

  private createAuroraGeometry(): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(2, 1, 32, 16);
    return geometry;
  }

  private createAuroraMaterial(): THREE.ShaderMaterial {
    const vertexShader = /* glsl */ `
      uniform float uTime;
      uniform float uWindSpeed;
      uniform float uIntensity;
      uniform float uColorShift;

      varying vec2 vUv;
      varying float vAlpha;
      varying vec3 vColor;

      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
        return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
      }

      void main() {
        vUv = uv;

        vec3 pos = position;

        float wave1 = sin(pos.x * 3.0 + uTime * 0.5) * 0.15 * uWindSpeed;
        float wave2 = sin(pos.x * 5.0 + uTime * 0.7 + 1.0) * 0.08 * uWindSpeed;
        float wave3 = cos(pos.x * 2.0 + uTime * 0.3) * 0.1 * uWindSpeed;

        pos.y += wave1 * uv.y;
        pos.y += wave2 * (1.0 - uv.y);
        pos.z += wave3 * uv.y * 0.5;

        float edgeFade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
        float bottomFade = smoothstep(0.0, 0.3, uv.y);
        vAlpha = edgeFade * bottomFade * uIntensity;

        float hue = 0.45 + uColorShift * 0.3 + uv.y * 0.2;
        vColor = hsl2rgb(vec3(hue, 0.8, 0.6));
        vColor += hsl2rgb(vec3(hue + 0.15, 0.9, 0.7)) * uv.y * 0.5;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;

      varying vec2 vUv;
      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        float alpha = vAlpha;

        float verticalFade = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        alpha *= verticalFade;

        float glow = vAlpha * 0.5;
        vec3 finalColor = vColor + vColor * glow;

        gl_FragColor = vec4(finalColor, alpha * 0.8);
      }
    `;

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWindSpeed: { value: 1 },
        uIntensity: { value: 0 },
        uColorShift: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  public setWindSpeed(speed: number): void {
    this.windSpeed = speed;
    this.material.uniforms.uWindSpeed.value = speed;
    this.material.uniforms.uColorShift.value = Math.min(speed / 10, 1) * 0.5;
  }

  public triggerAurora(): void {
    if (this.active) return;

    this.active = true;
    this.mesh.visible = true;
    this.auroraTimer = 0;

    const angle = Math.random() * Math.PI * 2;
    this.group.rotation.y = angle;

    gsap.to(this, {
      intensity: 1,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        this.material.uniforms.uIntensity.value = this.intensity;
      }
    });

    setTimeout(() => {
      gsap.to(this, {
        intensity: 0,
        duration: 2,
        ease: 'power2.in',
        onUpdate: () => {
          this.material.uniforms.uIntensity.value = this.intensity;
        },
        onComplete: () => {
          this.mesh.visible = false;
          this.active = false;
        }
      });
    }, (this.auroraDuration - 2) * 1000);
  }

  public update(deltaTime: number, timeScale: number): void {
    if (!this.active) {
      this.auroraTimer += deltaTime * timeScale;
      if (this.auroraTimer >= this.auroraInterval) {
        this.triggerAurora();
        this.auroraTimer = 0;
      }
    }

    this.time += deltaTime * timeScale;
    this.material.uniforms.uTime.value = this.time;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
