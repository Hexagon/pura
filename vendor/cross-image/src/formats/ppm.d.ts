import type { ImageData, ImageFormat } from "../types.js";
/**
 * PPM format handler
 * Implements the Netpbm PPM (Portable PixMap) format.
 * This is a simple uncompressed RGB format supported by many image tools.
 *
 * Format structure:
 * - P3 (ASCII format):
 *   P3
 *   <width> <height>
 *   <maxval>
 *   R G B R G B ... (space-separated decimal values)
 *
 * - P6 (Binary format):
 *   P6
 *   <width> <height>
 *   <maxval>
 *   RGB RGB RGB ... (binary byte data)
 */
export declare class PPMFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "ppm";
    /** MIME type for PPM images */
    readonly mimeType = "image/x-portable-pixmap";
    /**
     * Check if the given data is a PPM image
     * @param data Raw image data to check
     * @returns true if data has PPM signature (P3 or P6)
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode PPM image data to RGBA
     * Supports both P3 (ASCII) and P6 (binary) formats
     * @param data Raw PPM image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to PPM format (P6 binary)
     * Note: Alpha channel is ignored as PPM doesn't support transparency
     * @param imageData Image data to encode
     * @returns Encoded PPM image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
    /**
     * Check if a byte is whitespace (space, tab, CR, LF)
     */
    private isWhitespace;
}
//# sourceMappingURL=ppm.d.ts.map