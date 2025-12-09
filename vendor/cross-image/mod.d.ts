/**
 * @module @cross/image
 *
 * A pure JavaScript, dependency-free, cross-runtime image processing library.
 * Supports decoding, resizing, and encoding common image formats (PNG, APNG, JPEG, WebP, GIF, TIFF, BMP, ICO, DNG, PAM, PPM, PCX).
 * Includes image processing capabilities like compositing, level adjustments, and pixel manipulation.
 *
 * @example
 * ```ts
 * import { Image } from "@cross/image";
 *
 * // Decode an image
 * const data = await Deno.readFile("input.png");
 * const image = await Image.decode(data);
 *
 * // Apply image processing
 * image
 *   .resize({ width: 200, height: 200 })
 *   .brightness(0.1)
 *   .contrast(0.2);
 *
 * // Encode as different format
 * const output = await image.encode("jpeg");
 * await Deno.writeFile("output.jpg", output);
 * ```
 *
 * @example
 * ```ts
 * import { Image } from "@cross/image";
 *
 * // Create a blank canvas
 * const canvas = Image.create(400, 300, 255, 255, 255);
 *
 * // Draw on it
 * canvas.fillRect(50, 50, 100, 100, 255, 0, 0, 255);
 *
 * // Load and composite another image
 * const overlay = await Image.decode(await Deno.readFile("logo.png"));
 * canvas.composite(overlay, 10, 10, 0.8);
 *
 * // Save the result
 * await Deno.writeFile("result.png", await canvas.encode("png"));
 * ```
 */
export { Image } from "./src/image.js";
export type { ASCIIOptions, FrameMetadata, ImageData, ImageFormat, ImageFrame, ImageMetadata, MultiFrameImageData, ResizeOptions, WebPEncodeOptions, } from "./src/types.js";
export { PNGFormat } from "./src/formats/png.js";
export { APNGFormat } from "./src/formats/apng.js";
export { JPEGFormat } from "./src/formats/jpeg.js";
export { WebPFormat } from "./src/formats/webp.js";
export { GIFFormat } from "./src/formats/gif.js";
export { type TIFFEncodeOptions, TIFFFormat } from "./src/formats/tiff.js";
export { BMPFormat } from "./src/formats/bmp.js";
export { ICOFormat } from "./src/formats/ico.js";
export { DNGFormat } from "./src/formats/dng.js";
export { PAMFormat } from "./src/formats/pam.js";
export { PCXFormat } from "./src/formats/pcx.js";
export { PPMFormat } from "./src/formats/ppm.js";
export { ASCIIFormat } from "./src/formats/ascii.js";
//# sourceMappingURL=mod.d.ts.map