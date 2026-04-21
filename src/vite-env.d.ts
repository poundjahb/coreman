/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM_TARGET?: "IN_MEMORY" | "DATAVERSE" | "SQLITE";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
