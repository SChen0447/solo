/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    accept: () => void;
    dispose: (callback: () => void) => void;
    decline: () => void;
    invalidate: () => void;
  };
}
