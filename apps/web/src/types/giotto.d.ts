/** Public surface verified against Giotto b0809dc; upstream ships JavaScript only. */
declare module "giotto/player" {
  export class GiottoPlayer extends HTMLElement {
    doc: object;
    figStyle: {
      font?: string;
      shadow?: boolean;
      radius?: number;
      dark?: { packetText?: string };
    };
  }
}
