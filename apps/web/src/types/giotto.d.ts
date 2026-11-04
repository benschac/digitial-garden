/** Public surface verified against Giotto b0809dc; upstream ships JavaScript only. */
declare module "giotto/player" {
  export class GiottoPlayer extends HTMLElement {
    doc: object;
    figStyle: {
      font?: string;
      shadow?: boolean;
      radius?: number;
      codeFill?: string;
      codeText?: string;
      dark?: { packetText?: string; codeFill?: string; codeText?: string };
    };
  }
}

declare module "giotto/scenes" {
  export interface DiagramDocument {
    readonly elements: readonly object[];
    readonly scenes?: readonly {
      readonly beats?: readonly { readonly say?: string }[];
    }[];
  }

  export interface Timeline {
    scenes: {
      beats: { say?: string; start: number; ms: number }[];
    }[];
    total: number;
  }

  export interface Frame {
    active: object[];
  }

  export function timeline(document: DiagramDocument): Timeline;
  export function frameAt(
    document: DiagramDocument,
    scene: number,
    time: number,
    times?: Timeline
  ): Frame | null;
  export function sceneWarnings(document: DiagramDocument): string[];
}

declare module "giotto/render" {
  import type { DiagramDocument, Frame } from "giotto/scenes";

  export function layoutWarnings(document: DiagramDocument): string[];
  export function toSvg(
    document: DiagramDocument,
    style?: undefined,
    options?: { frame?: Frame | null }
  ): string;
}
