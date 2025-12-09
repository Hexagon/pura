import type { ImageData } from "../types.js";
import { TIFFFormat } from "./tiff.js";
/**
 * DNG format handler
 * Implements a basic Linear DNG (Digital Negative) writer.
 * DNG is based on TIFF/EP. This implementation creates a valid DNG
 * containing uncompressed linear RGB data (demosaiced).
 */
export declare class DNGFormat extends TIFFFormat {
    /** Format name identifier */
    readonly name = "dng";
    /** MIME type for DNG images */
    readonly mimeType = "image/x-adobe-dng";
    /**
     * Check if the given data is a DNG image
     * @param data Raw image data to check
     * @returns true if data has DNG signature (TIFF signature + DNGVersion tag)
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Encode RGBA image data to DNG format (Linear DNG)
     * @param imageData Image data to encode
     * @returns Encoded DNG image bytes
     */
    encode(imageData: ImageData): Promise<Uint8Array>;
}
//# sourceMappingURL=dng.d.ts.map