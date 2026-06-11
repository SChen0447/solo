export interface RecorderHandle {
  id: string;
  mediaRecorder: MediaRecorder;
  chunks: BlobPart[];
}

export interface RecorderOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  onStop?: (blob: Blob) => void;
  onStart?: () => void;
  onError?: (error: Error) => void;
}

export const Recorder = {
  activeRecorders: new Map<string, RecorderHandle>(),

  getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  },

  start(stream: MediaStream, options: RecorderOptions = {}): RecorderHandle {
    const id = `recorder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const mimeType = options.mimeType || this.getSupportedMimeType();

    const mediaRecorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond || 6000000,
      audioBitsPerSecond: options.audioBitsPerSecond || 128000,
    };

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
    } catch (error) {
      mediaRecorder = new MediaRecorder(stream);
    }

    const handle: RecorderHandle = {
      id,
      mediaRecorder,
      chunks: [],
    };

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        handle.chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(handle.chunks, { type: mimeType });
      handle.chunks = [];
      this.activeRecorders.delete(id);

      if (options.onStop) {
        options.onStop(blob);
      }
    };

    mediaRecorder.onerror = (_event: Event) => {
      this.activeRecorders.delete(id);
      if (options.onError) {
        options.onError(new Error('Recording error'));
      }
    };

    mediaRecorder.onstart = () => {
      if (options.onStart) {
        options.onStart();
      }
    };

    mediaRecorder.start(200);

    this.activeRecorders.set(id, handle);

    return handle;
  },

  stop(handle: RecorderHandle): void {
    const { mediaRecorder } = handle;

    if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
      mediaRecorder.stop();
    }

    this.activeRecorders.delete(handle.id);
  },

  pause(handle: RecorderHandle): void {
    if (handle.mediaRecorder.state === 'recording') {
      handle.mediaRecorder.pause();
    }
  },

  resume(handle: RecorderHandle): void {
    if (handle.mediaRecorder.state === 'paused') {
      handle.mediaRecorder.resume();
    }
  },

  isRecording(handle: RecorderHandle): boolean {
    return handle.mediaRecorder.state === 'recording';
  },

  getActiveRecorders(): RecorderHandle[] {
    return Array.from(this.activeRecorders.values());
  },

  stopAll(): void {
    this.activeRecorders.forEach((handle) => {
      this.stop(handle);
    });
  },

  download(blob: Blob, filename: string = 'recording.webm'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  },

  async preview(blob: Blob): Promise<string> {
    return URL.createObjectURL(blob);
  },

  async getBlob(handle: RecorderHandle): Promise<Blob> {
    const mimeType = handle.mediaRecorder.mimeType || 'video/webm';
    return new Blob(handle.chunks, { type: mimeType });
  },
};
