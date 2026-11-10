/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Personal NASA API key (https://api.nasa.gov). Optional: DEMO_KEY is used without it. */
  readonly VITE_NASA_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
