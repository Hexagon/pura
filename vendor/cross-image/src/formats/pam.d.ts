import type { ImageData, ImageFormat } from "../types.js";
/**
 * PAM format handler
 * Implements the Netpbm PAM (Portable Arbitrary Map) format.
 * This is a standard uncompressed format supported by GIMP and other tools.
 *
 * Format structure:
 * - Header (text):
 *   P7
 *   WIDTH <width>
 *   HEIGHT <height>
 *   DEPTH 4
 *   MAXVAL 255
 *   TUPLTYPE RGB_ALPHA
 *   ENDHDR
 * - Data (binary):
 *   RGBA pixel data (width * height * 4 bytes)
 */
export declare class PAMFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "pam";
    /** MIME type for PAM images */
    readonly mimeType = "image/x-portable-arbitrary-map";
    /**
     * Check if the given data is a PAM image
     * @param data Raw image data to check
     * @returns true if data has PAM signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode PAM image data to RGBA
     * @param data Raw PAM image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to PAM format
     * @param imageData Image data to encode
     * @returns Encoded PAM image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
}
//# sourceMappingURL=pam.d.ts.map