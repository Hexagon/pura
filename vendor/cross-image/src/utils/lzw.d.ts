/**
 * LZW (Lempel-Ziv-Welch) compression and decompression
 * Used for GIF image encoding and decoding
 */
/**
 * LZW Decompressor for GIF images
 */
export declare class LZWDecoder {
    private minCodeSize;
    private clearCode;
    private endCode;
    private data;
    private pos;
    private bitPos;
    private codeSize;
    private maxCode;
    private dict;
    private prevCode;
    private nextCode;
    constructor(minCodeSize: number, data: Uint8Array);
    private initDictionary;
    private readCode;
    decompress(): Uint8Array;
}
/**
 * LZW Encoder for GIF images
 */
export declare class LZWEncoder {
    private minCodeSize;
    private clearCode;
    private endCode;
    private codeSize;
    private maxCode;
    private dict;
    private output;
    private bitBuffer;
    private bitCount;
    constructor(minCodeSize: number);
    private initDictionary;
    private writeCode;
    compress(data: Uint8Array): Uint8Array;
}
//# sourceMappingURL=lzw.d.ts.map