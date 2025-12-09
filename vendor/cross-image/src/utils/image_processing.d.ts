/**
 * Image processing utilities for common operations like compositing,
 * level adjustments, and color manipulations.
 */
/**
 * Composite one image on top of another at a specified position
 * @param base Base image data (RGBA)
 * @param baseWidth Base image width
 * @param baseHeight Base image height
 * @param overlay Overlay image data (RGBA)
 * @param overlayWidth Overlay image width
 * @param overlayHeight Overlay image height
 * @param x X position to place overlay (can be negative)
 * @param y Y position to place overlay (can be negative)
 * @param opacity Opacity of overlay (0-1, default: 1)
 * @returns New image data with overlay composited on base
 */
export declare function composite(base: Uint8Array, baseWidth: number, baseHeight: number, overlay: Uint8Array, overlayWidth: number, overlayHeight: number, x: number, y: number, opacity?: number): Uint8Array;
/**
 * Adjust brightness of an image
 * @param data Image data (RGBA)
 * @param amount Brightness adjustment (-1 to 1, where 0 is no change)
 * @returns New image data with adjusted brightness
 */
export declare function adjustBrightness(data: Uint8Array, amount: number): Uint8Array;
/**
 * Adjust contrast of an image
 * @param data Image data (RGBA)
 * @param amount Contrast adjustment (-1 to 1, where 0 is no change)
 * @returns New image data with adjusted contrast
 */
export declare function adjustContrast(data: Uint8Array, amount: number): Uint8Array;
/**
 * Adjust exposure of an image
 * @param data Image data (RGBA)
 * @param amount Exposure adjustment in stops (-3 to 3, where 0 is no change)
 * @returns New image data with adjusted exposure
 */
export declare function adjustExposure(data: Uint8Array, amount: number): Uint8Array;
/**
 * Adjust saturation of an image
 * @param data Image data (RGBA)
 * @param amount Saturation adjustment (-1 to 1, where 0 is no change)
 * @returns New image data with adjusted saturation
 */
export declare function adjustSaturation(data: Uint8Array, amount: number): Uint8Array;
/**
 * Invert colors of an image
 * @param data Image data (RGBA)
 * @returns New image data with inverted colors
 */
export declare function invert(data: Uint8Array): Uint8Array;
/**
 * Convert image to grayscale
 * @param data Image data (RGBA)
 * @returns New image data in grayscale
 */
export declare function grayscale(data: Uint8Array): Uint8Array;
/**
 * Fill a rectangular region with a color
 * @param data Image data (RGBA)
 * @param width Image width
 * @param height Image height
 * @param x Starting X position
 * @param y Starting Y position
 * @param fillWidth Width of the fill region
 * @param fillHeight Height of the fill region
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param a Alpha component (0-255)
 * @returns Modified image data
 */
export declare function fillRect(data: Uint8Array, width: number, height: number, x: number, y: number, fillWidth: number, fillHeight: number, r: number, g: number, b: number, a: number): Uint8Array;
/**
 * Crop an image to a rectangular region
 * @param data Image data (RGBA)
 * @param width Image width
 * @param height Image height
 * @param x Starting X position
 * @param y Starting Y position
 * @param cropWidth Width of the crop region
 * @param cropHeight Height of the crop region
 * @returns Cropped image data and dimensions
 */
export declare function crop(data: Uint8Array, width: number, height: number, x: number, y: number, cropWidth: number, cropHeight: number): {
    data: Uint8Array;
    width: number;
    height: number;
};
/**
 * Apply a box blur filter to an image
 * @param data Image data (RGBA)
 * @param width Image width
 * @param height Image height
 * @param radius Blur radius (default: 1)
 * @returns New image data with box blur applied
 */
export declare function boxBlur(data: Uint8Array, width: number, height: number, radius?: number): Uint8Array;
/**
 * Apply Gaussian blur to an image
 * @param data Image data (RGBA)
 * @param width Image width
 * @param height Image height
 * @param radius Blur radius (default: 1)
 * @param sigma Optional standard deviation (if not provided, calculated from radius)
 * @returns New image data with Gaussian blur applied
 */
export declare function gaussianBlur(data: Uint8Array, width: number, height: number, radius?: number, sigma?: number): Uint8Array;
/**
 * Apply sharpen filter to an image
 * @param data Image data (RGBA)
 * @param width Image width
 * @param height Image height
 * @param amount Sharpening amount (0-1, default: 0.5)
 * @returns New image data with sharpening applied
 */
export declare function sharpen(data: Uint8Array, width: number, height: number, amount?: number): Uint8Array;
/**
 * Apply sepia tone effect to an image
 * @param data Image data (RGBA)
 * @returns New image data with sepia tone applied
 */
export declare function sepia(data: Uint8Array): Uint8Array;
/**
 * Apply median filter to reduce noise
 * @param data Image data (RGBA)
 * @param width Image width
 * @param height Image height
 * @param radius Filter radius (default: 1)
 * @returns New image data with median filter applied
 */
export declare function medianFilter(data: Uint8Array, width: number, height: number, radius?: number): Uint8Array;
//# sourceMappingURL=image_processing.d.ts.map