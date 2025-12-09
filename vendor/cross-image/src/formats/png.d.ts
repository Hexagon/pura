import type { ImageData, ImageFormat } from "../types.js";
import { PNGBase } from "./png_base.js";
/**
 * PNG format handler
 * Implements a pure JavaScript PNG decoder and encoder
 */
export declare class PNGFormat extends PNGBase implements ImageFormat {
    /** Format name identifier */
    readonly name = "png";
    /** MIME type for PNG images */
    readonly mimeType = "image/png";
    /**
     * Check if the given data is a PNG image
     * @param data Raw image data to check
     * @returns true if data has PNG signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode PNG image data to RGBA
     * @param data Raw PNG image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to PNG format
     * @param imageData Image data to encode
     * @returns Encoded PNG image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
}
//# sourceMappingURL=png.d.ts.map