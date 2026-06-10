import * as THREE from 'three';

export class PostProcessingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private sceneRT: THREE.WebGLRenderTarget;
  private brightPassRT: THREE.WebGLRenderTarget;
  private blurRT1: THREE.WebGLRenderTarget;
  private blurRT2: THREE.WebGLRenderTarget;

  private brightPassMaterial: THREE.ShaderMaterial;
  private blurMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;

  private fullscreenQuad: THREE.Mesh;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;

  private bloomStrength: number = 0.8;
  private bloomRadius: number = 0.6;
  private bloomThreshold: number = 0.4;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const rtParams: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };

    this.sceneRT = new THREE.WebGLRenderTarget(width, height, rtParams);
    this.brightPassRT = new THREE.WebGLRenderTarget(width / 2, height / 2, rtParams);
    this.blurRT1 = new THREE.WebGLRenderTarget(width / 2, height / 2, rtParams);
    this.blurRT2 = new THREE.WebGLRenderTarget(width / 2, height / 2, rtParams);

    this.brightPassMaterial = this.createBrightPassMaterial();
    this.blurMaterial = this.createBlurMaterial();
    this.compositeMaterial = this.createCompositeMaterial();

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fullscreenQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.brightPassMaterial
    );
    this.quadScene.add(this.fullscreenQuad);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createBrightPassMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: this.bloomThreshold },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float threshold;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
          if (brightness > threshold) {
            gl_FragColor = color * (brightness - threshold) / (1.0 - threshold + 0.001);
          } else {
            gl_FragColor = vec4(0.0);
          }
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
  }

  private createBlurMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
        direction: { value: new THREE.Vector2(1, 0) },
        radius: { value: this.bloomRadius },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform vec2 direction;
        uniform float radius;
        varying vec2 vUv;

        void main() {
          vec2 texelSize = 1.0 / resolution;
          vec4 result = vec4(0.0);
          float totalWeight = 0.0;

          const int samples = 9;
          float weights[9];
          weights[0] = 0.227027;
          weights[1] = 0.1945946;
          weights[2] = 0.1216216;
          weights[3] = 0.054054;
          weights[4] = 0.016216;
          weights[5] = 0.016216;
          weights[6] = 0.054054;
          weights[7] = 0.1216216;
          weights[8] = 0.1945946;

          float offsets[9];
          offsets[0] = 0.0;
          offsets[1] = 1.0;
          offsets[2] = 2.0;
          offsets[3] = 3.0;
          offsets[4] = 4.0;
          offsets[5] = -4.0;
          offsets[6] = -3.0;
          offsets[7] = -2.0;
          offsets[8] = -1.0;

          for (int i = 0; i < samples; i++) {
            vec2 offset = direction * texelSize * offsets[i] * radius * 4.0;
            result += texture2D(tDiffuse, vUv + offset) * weights[i];
            totalWeight += weights[i];
          }

          gl_FragColor = result / totalWeight;
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
  }

  private createCompositeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        bloomStrength: { value: this.bloomStrength },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float bloomStrength;
        varying vec2 vUv;

        vec3 aces(vec3 x) {
          const float a = 2.51;
          const float b = 0.03;
          const float c = 2.43;
          const float d = 0.59;
          const float e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }

        void main() {
          vec3 sceneColor = texture2D(tDiffuse, vUv).rgb;
          vec3 bloomColor = texture2D(tBloom, vUv).rgb;
          vec3 purpleTint = vec3(0.5, 0.2, 1.0);
          vec3 tintedBloom = mix(bloomColor, bloomColor * purpleTint, 0.3);
          vec3 finalColor = sceneColor + tintedBloom * bloomStrength;
          finalColor = aces(finalColor);
          finalColor = pow(finalColor, vec3(1.0 / 2.2));
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.sceneRT.setSize(width, height);
    this.brightPassRT.setSize(width / 2, height / 2);
    this.blurRT1.setSize(width / 2, height / 2);
    this.blurRT2.setSize(width / 2, height / 2);
  }

  public setBloomStrength(strength: number): void {
    this.bloomStrength = strength;
    this.compositeMaterial.uniforms.bloomStrength.value = strength;
  }

  public render(): void {
    this.renderer.setRenderTarget(this.sceneRT);
    this.renderer.render(this.scene, this.camera);

    this.fullscreenQuad.material = this.brightPassMaterial;
    this.brightPassMaterial.uniforms.tDiffuse.value = this.sceneRT.texture;
    this.brightPassMaterial.uniforms.threshold.value = this.bloomThreshold;
    this.renderer.setRenderTarget(this.brightPassRT);
    this.renderer.render(this.quadScene, this.quadCamera);

    this.fullscreenQuad.material = this.blurMaterial;
    this.blurMaterial.uniforms.tDiffuse.value = this.brightPassRT.texture;
    this.blurMaterial.uniforms.resolution.value.set(this.brightPassRT.width, this.brightPassRT.height);
    this.blurMaterial.uniforms.direction.value.set(1, 0);
    this.blurMaterial.uniforms.radius.value = this.bloomRadius;
    this.renderer.setRenderTarget(this.blurRT1);
    this.renderer.render(this.quadScene, this.quadCamera);

    this.blurMaterial.uniforms.tDiffuse.value = this.blurRT1.texture;
    this.blurMaterial.uniforms.direction.value.set(0, 1);
    this.renderer.setRenderTarget(this.blurRT2);
    this.renderer.render(this.quadScene, this.quadCamera);

    this.blurMaterial.uniforms.tDiffuse.value = this.blurRT2.texture;
    this.blurMaterial.uniforms.direction.value.set(1, 0);
    this.blurMaterial.uniforms.radius.value = this.bloomRadius * 1.5;
    this.renderer.setRenderTarget(this.blurRT1);
    this.renderer.render(this.quadScene, this.quadCamera);

    this.blurMaterial.uniforms.tDiffuse.value = this.blurRT1.texture;
    this.blurMaterial.uniforms.direction.value.set(0, 1);
    this.renderer.setRenderTarget(this.blurRT2);
    this.renderer.render(this.quadScene, this.quadCamera);

    this.fullscreenQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.tDiffuse.value = this.sceneRT.texture;
    this.compositeMaterial.uniforms.tBloom.value = this.blurRT2.texture;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  public dispose(): void {
    this.sceneRT.dispose();
    this.brightPassRT.dispose();
    this.blurRT1.dispose();
    this.blurRT2.dispose();
    this.brightPassMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.fullscreenQuad.geometry.dispose();
  }
}
