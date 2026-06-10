import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

export class RTCamera {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isInitialized: boolean = false;

  async init(): Promise<HTMLVideoElement> {
    if (this.isInitialized && this.video) {
      return this.video;
    }

    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');
    this.video.style.display = 'none';

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    this.video.srcObject = this.stream;
    await this.video.play();

    this.isInitialized = true;
    document.body.appendChild(this.video);

    return this.video;
  }

  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
    this.isInitialized = false;
  }
}

export const rtCamera = new RTCamera();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
