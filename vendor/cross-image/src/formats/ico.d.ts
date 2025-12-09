import type { ImageData, ImageFormat } from "../types.js";
/**
 * ICO format handler
 * Implements a pure JavaScript ICO (Windows Icon) decoder and encoder
 *
 * ICO files can contain multiple images at different sizes.
 * This implementation decodes the largest image and encodes as a single-image ICO.
 */
export declare class ICOFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "ico";
    /** MIME type for ICO images */
    readonly mimeType = "image/x-icon";
    private pngFormat;
    /**
     * Check if the given data is an ICO image
     * @param data Raw image data to check
     * @returns true if data has ICO/CUR signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode ICO image data to RGBA
     * Selects and decodes the largest image in the ICO file
     * @param data Raw ICO image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Decode a DIB (Device Independent Bitmap) format
     * This is a BMP without the 14-byte file header
     */
    private decodeDIB;
    /**
     * Encode RGBA image data to ICO format
     * Creates an ICO file with a single PNG-encoded image
     * @param imageData Image data to encode
     * @returns Encoded ICO image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
}
//# sourceMappingURL=ico.d.ts.map