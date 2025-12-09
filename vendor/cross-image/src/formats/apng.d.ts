import type { ImageData, ImageFormat, MultiFrameImageData } from "../types.js";
import { PNGBase } from "./png_base.js";
/**
 * APNG (Animated PNG) format handler
 * Implements support for animated PNG images with multiple frames
 * APNG extends PNG with animation control chunks (acTL, fcTL, fdAT)
 */
export declare class APNGFormat extends PNGBase implements ImageFormat {
    /** Format name identifier */
    readonly name = "apng";
    /** MIME type for APNG images */
    readonly mimeType = "image/apng";
    /**
     * Check if this format supports multiple frames (animations)
     * @returns true for APNG format
     */
    supportsMultipleFrames(): boolean;
    /**
     * Check if the given data is an APNG image
     * @param data Raw image data to check
     * @returns true if data has PNG signature and contains acTL chunk
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode APNG image data to RGBA (first frame only)
     * @param data Raw APNG image data
     * @returns Decoded image data with RGBA pixels of first frame
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Decode all frames from APNG image
     * @param data Raw APNG image data
     * @returns Decoded multi-frame image data
     */
    decodeFrames(data: Uint8Array): Promise<MultiFrameImageData>;
    /**
     * Encode RGBA image data to APNG format (single frame)
     * @param imageData Image data to encode
     * @returns Encoded APNG image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
    /**
     * Encode multi-frame image data to APNG format
     * @param imageData Multi-frame image data to encode
     * @returns Encoded APNG image bytes
     */
    encodeFrames(imageData: MultiFrameImageData): Promise<Uint8Array>;
    private decodeFrameData;
}
//# sourceMappingURL=apng.d.ts.map