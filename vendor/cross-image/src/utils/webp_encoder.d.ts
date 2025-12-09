/**
 * WebP VP8L (Lossless) encoder implementation with quality-based quantization
 *
 * This module implements a pure JavaScript encoder for WebP lossless (VP8L) format.
 * It supports:
 * - Lossless encoding (quality=100) with Huffman coding
 * - Lossy encoding (quality<100) using color quantization while still using VP8L format
 * - Simple Huffman coding (1-2 symbols per channel)
 * - Complex Huffman coding for channels with many unique values (3+ symbols)
 * - Literal pixel encoding (no transforms applied)
 *
 * Current limitations:
 * - Does not use transforms (predictor, color, subtract green, color indexing)
 * - Does not use LZ77 backward references (planned for future)
 * - Does not use color cache (planned for future)
 * - Lossy mode uses simple quantization, not true VP8 lossy encoding
 * - Intended as a fallback when OffscreenCanvas is not available
 *
 * This encoder produces valid WebP lossless files with optional quality-based
 * color quantization for lossy compression. For true VP8 lossy encoding with
 * better compression, use the runtime's OffscreenCanvas API when available.
 *
 * @see https://developers.google.com/speed/webp/docs/riff_container
 * @see https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification
 */
export declare class WebPEncoder {
    private width;
    private height;
    private data;
    private quality;
    constructor(width: number, height: number, rgba: Uint8Array);
    encode(quality?: number): Uint8Array;
    private encodeVP8L;
    private hasAlphaChannel;
    /**
     * Quantize image data based on quality setting
     * Quality 100 = no quantization (lossless)
     * Quality 1-99 = quantize colors to reduce bit depth
     * This creates a "lossy" effect while still using VP8L format
     */
    private quantizeImageData;
    private encodeImageData;
    /**
     * Write Huffman code for a channel (either simple or complex)
     * Returns the Huffman codes for encoding pixels
     */
    private writeHuffmanCode;
    /**
     * Write a symbol using its Huffman code
     */
    private writeSymbol;
    private writeSimpleHuffmanCode;
    /**
     * Calculate optimal code lengths for symbols using standard Huffman algorithm
     * Returns an array where index is the symbol and value is the code length
     */
    private calculateCodeLengths;
    /**
     * Build canonical Huffman codes from code lengths
     * Returns a map from symbol to {code, length}
     */
    private buildCanonicalCodes;
    /**
     * RLE encode code lengths using special codes 16, 17, 18
     */
    private rleEncodeCodeLengths;
    /**
     * Write complex Huffman code using code lengths
     */
    private writeComplexHuffmanCode;
}
//# sourceMappingURL=webp_encoder.d.ts.map