/**
 * Pure JavaScript GIF encoder implementation
 * Supports GIF89a format with LZW compression
 */
export declare class GIFEncoder {
    private width;
    private height;
    private frames;
    constructor(width: number, height: number, data?: Uint8Array);
    addFrame(data: Uint8Array, delay?: number): void;
    private writeBytes;
    private writeUint16LE;
    private writeString;
    /**
     * Quantize a color channel value to a specified number of levels
     * @param value - The input color channel value (0-255)
     * @param levels - Number of quantization levels minus 1 (e.g., 7 for 8 levels)
     * @param step - Step size for quantization (e.g., 255/7)
     * @returns Quantized integer value
     */
    private quantizeChannel;
    /**
     * Quantize RGBA image to 256 colors using median cut algorithm
     */
    private quantize;
    private nextPowerOf2;
    private getBitsPerColor;
    encode(): Uint8Array;
}
//# sourceMappingURL=gif_encoder.d.ts.map