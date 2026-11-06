declare namespace NodeJS {
  interface ProcessEnv {
    /** The `version` field of package.json, injected by next.config.js. */
    readonly NEXT_PUBLIC_APP_VERSION: string;
  }
}

declare module "*?raw" {
  const content: string;
  export default content;
}
