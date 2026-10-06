/// <reference types="vite/client" />

declare module "path" {
  export function resolve(...pathSegments: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, suffix?: string): string;
  export function extname(path: string): string;
}

declare const __dirname: string;
