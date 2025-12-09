/**
 * Security utilities for image processing
 * Prevents integer overflow, heap exhaustion, and decompression bombs
 */
/**
 * Maximum safe image dimensions
 * These limits prevent integer overflow and heap exhaustion attacks
 */
export declare const MAX_IMAGE_DIMENSION = 65535;
export declare const MAX_IMAGE_PIXELS = 178956970;
/**
 * Validates image dimensions to prevent security vulnerabilities
 *
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @throws Error if dimensions are invalid or unsafe
 */
export declare function validateImageDimensions(width: number, height: number): void;
/**
 * Safely calculates buffer size for RGBA image data
 *
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @returns Buffer size in bytes (width * height * 4)
 * @throws Error if calculation would overflow
 */
export declare function calculateBufferSize(width: number, height: number): number;
//# sourceMappingURL=security.d.ts.map