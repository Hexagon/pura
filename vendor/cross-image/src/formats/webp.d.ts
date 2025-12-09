import type { ImageData, ImageFormat, WebPEncodeOptions } from "../types.js";
/**
 * WebP format handler
 * Implements a basic WebP decoder and encoder
 */
export declare class WebPFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "webp";
    /** MIME type for WebP images */
    readonly mimeType = "image/webp";
    /**
     * Check if the given data is a WebP image
     * @param data Raw image data to check
     * @returns true if data has WebP signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode WebP image data to RGBA
     * @param data Raw WebP image data
     * @returns Decoded image data with RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to WebP format
     * @param imageData Image data to encode
     * @param options Optional WebP encoding options
     * @returns Encoded WebP image bytes
     */
    encode(imageData: ImageData, options?: WebPEncodeOptions): Promise<Uint8Array>;
    private readUint24LE;
    private decodeUsingRuntime;
    private parseEXIF;
    private parseXMP;
    private injectMetadata;
    private createEXIFChunk;
    private createXMPChunk;
    private escapeXML;
}
//# sourceMappingURL=webp.d.ts.map