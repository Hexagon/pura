import type { ASCIIOptions, ImageData, ImageFormat } from "../types.js";
/**
 * ASCII format handler
 * Converts images to ASCII art text representation
 *
 * Format structure:
 * - Magic bytes (6 bytes): "ASCII\n" (0x41 0x53 0x43 0x49 0x49 0x0A)
 * - Options line: "width:W charset:C aspectRatio:A invert:I\n"
 * - ASCII art text (UTF-8 encoded)
 *
 * Note: This format is primarily for encoding (image to ASCII).
 * Decoding reconstructs a basic grayscale approximation.
 */
export declare class ASCIIFormat implements ImageFormat {
    readonly name = "ascii";
    readonly mimeType = "text/plain";
    private readonly MAGIC_BYTES;
    private readonly CHARSETS;
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode ASCII art to a basic grayscale RGBA image
     * @param data Raw ASCII art data
     * @returns Decoded image data with grayscale RGBA pixels
     */
    decode(data: Uint8Array): Promise<ImageData>;
    /**
     * Encode RGBA image data to ASCII art
     * @param imageData Image data to encode
     * @param options Optional ASCII encoding options
     * @returns Encoded ASCII art as UTF-8 bytes
     */
    encode(imageData: ImageData, options?: ASCIIOptions): Promise<Uint8Array>;
    /**
     * Parse options from the options line
     */
    private parseOptions;
}
//# sourceMappingURL=ascii.d.ts.map