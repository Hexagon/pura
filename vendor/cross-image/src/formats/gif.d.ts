import type { ImageData, ImageFormat, MultiFrameImageData } from "../types.js";
/**
 * GIF format handler
 * Now includes pure-JS implementation with custom LZW compression/decompression
 *
 * Features:
 * - LZW compression/decompression
 * - Color quantization and palette generation for encoding
 * - Interlacing support
 * - Transparency support
 * - Multi-frame animation support (decoding and encoding)
 * - Falls back to runtime APIs when pure-JS fails
 */
export declare class GIFFormat implements ImageFormat {
    /** Format name identifier */
    readonly name = "gif";
    /** MIME type for GIF images */
    readonly mimeType = "image/gif";
    /**
     * Check if this format supports multiple frames (animations)
     * @returns true for GIF format
     */
    supportsMultipleFrames(): boolean;
    /**
     * Check if the given data is a GIF image
     * @param data Raw image data to check
     * @returns true if data has GIF signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode GIF image data to RGBA (first frame only)
     * @param data Raw GIF image data
     * @returns Decoded image data with RGBA pixels of first frame
     */
    decode(data: Uint8Array): Promise<ImageData>;
    private extractMetadata;
    /**
     * Encode RGBA image data to GIF format (single frame)
     * @param imageData Image data to encode
     * @returns Encoded GIF image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
    /**
     * Decode all frames from an animated GIF
     */
    decodeFrames(data: Uint8Array): Promise<MultiFrameImageData>;
    /**
     * Encode multi-frame image data to animated GIF
     */
    encodeFrames(imageData: MultiFrameImageData, _options?: unknown): Promise<Uint8Array>;
    private mapDisposalMethod;
    private decodeUsingRuntime;
    private readDataSubBlocks;
    private parseComment;
    private parseXMP;
    private injectMetadata;
    private createCommentText;
}
//# sourceMappingURL=gif.d.ts.map