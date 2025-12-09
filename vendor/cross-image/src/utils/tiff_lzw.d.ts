/**
 * LZW compression and decompression for TIFF images
 *
 * TIFF LZW differs from GIF LZW in several ways:
 * - Uses MSB-first bit ordering (big-endian bits)
 * - Typically starts with 9-bit codes
 * - Uses code 256 as clear code, code 257 as end-of-information (EOI)
 * - Variable code size from 9 to 12 bits
 */
/**
 * LZW Decompressor for TIFF images
 */
export declare class TIFFLZWDecoder {
    private data;
    private pos;
    private bitPos;
    private codeSize;
    private dict;
    private clearCode;
    private eoiCode;
    private nextCode;
    constructor(data: Uint8Array);
    private initDictionary;
    private readCode;
    decompress(): Uint8Array;
}
/**
 * LZW Encoder for TIFF images
 */
export declare class TIFFLZWEncoder {
    private codeSize;
    private dict;
    private output;
    private bitBuffer;
    private bitCount;
    private clearCode;
    private eoiCode;
    private nextCode;
    constructor();
    private initDictionary;
    private writeCode;
    compress(data: Uint8Array): Uint8Array;
}
//# sourceMappingURL=tiff_lzw.d.ts.map