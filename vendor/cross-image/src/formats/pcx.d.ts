import type { ImageData, ImageFormat } from "../types.js";
/**
 * PCX format handler
 * Implements PCX decoder and encoder
 */
export declare class PCXFormat implements ImageFormat {
    readonly name = "pcx";
    readonly mimeType = "image/x-pcx";
    canDecode(data: Uint8Array): boolean;
    decode(data: Uint8Array): Promise<ImageData>;
    encode(image: ImageData): Promise<Uint8Array>;
}
//# sourceMappingURL=pcx.d.ts.map