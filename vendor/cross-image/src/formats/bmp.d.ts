import type { ImageData, ImageFormat } from "../types.js";
/**
 * BMP format handler
 * Implements a pure JavaScript BMP decoder and encoder
 */
export declare class BMPFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "bmp";
    /** MIME type for BMP images */
    readonly mimeType = "image/bmp";
    /**
     * Check if the given data is a BMP image
     * @param data Raw image data to check
     * @returns true if data has BMP signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode BMP image data to RGBA
     * @param data Raw BMP image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to BMP format
     * @param imageData Image data to encode
     * @returns Encoded BMP image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
}
//# sourceMappingURL=bmp.d.ts.map