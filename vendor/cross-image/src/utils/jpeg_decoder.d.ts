/**
 * Basic baseline JPEG decoder implementation
 * Supports baseline DCT JPEG images (the most common format)
 *
 * This is a simplified implementation that handles common JPEG files.
 * For complex or non-standard JPEGs, the ImageDecoder API fallback is preferred.
 */
export declare class JPEGDecoder {
    private data;
    private pos;
    private width;
    private height;
    private components;
    private qTables;
    private dcTables;
    private acTables;
    private restartInterval;
    private bitBuffer;
    private bitCount;
    constructor(data: Uint8Array);
    decode(): Uint8Array;
    private readMarker;
    private readUint16;
    private skipSegment;
    private parseDQT;
    private parseDHT;
    private buildHuffmanTable;
    private parseSOF;
    private parseSOS;
    private parseDRI;
    private decodeScan;
    private decodeBlock;
    private decodeHuffman;
    private readBit;
    private receiveBits;
    private idct;
    private convertToRGB;
}
//# sourceMappingURL=jpeg_decoder.d.ts.map