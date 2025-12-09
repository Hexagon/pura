/**
 * WebP VP8L (Lossless) decoder implementation
 *
 * This module implements a pure JavaScript decoder for WebP lossless (VP8L) format.
 * It supports:
 * - Huffman coding (canonical Huffman codes)
 * - LZ77 backward references for compression
 * - Color cache for repeated colors
 * - Simple and complex Huffman code tables
 *
 * Current limitations:
 * - Does not support transforms (predictor, color, subtract green, color indexing)
 * - Does not support meta Huffman codes
 * - Does not support lossy WebP (VP8) format
 *
 * For images with transforms or lossy compression, the decoder will fall back
 * to the runtime's ImageDecoder API if available.
 *
 * @see https://developers.google.com/speed/webp/docs/riff_container
 * @see https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification
 */
export declare class WebPDecoder {
    private data;
    constructor(data: Uint8Array);
    decode(): {
        width: number;
        height: number;
        data: Uint8Array;
    };
    private decodeVP8L;
    private decodeImageData;
    private readHuffmanCodes;
    private readHuffmanCode;
    private readCodeLengths;
    private buildHuffmanTable;
    private getLength;
    private getDistance;
}
//# sourceMappingURL=webp_decoder.d.ts.map