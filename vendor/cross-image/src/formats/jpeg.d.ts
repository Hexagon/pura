import type { ImageData, ImageFormat } from "../types.js";
/**
 * JPEG format handler
 * Implements a basic JPEG decoder and encoder
 */
export declare class JPEGFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "jpeg";
    /** MIME type for JPEG images */
    readonly mimeType = "image/jpeg";
    /**
     * Check if the given data is a JPEG image
     * @param data Raw image data to check
     * @returns true if data has JPEG signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode JPEG image data to RGBA
     * @param data Raw JPEG image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to JPEG format
     * @param imageData Image data to encode
     * @returns Encoded JPEG image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
    private injectMetadata;
    private decodeUsingRuntime;
    private parseJFIF;
    private parseEXIF;
    private createEXIFData;
}
//# sourceMappingURL=jpeg.d.ts.map