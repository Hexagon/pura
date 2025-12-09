/**
 * Basic baseline JPEG encoder implementation
 * Produces valid baseline DCT JPEG images
 *
 * This is a simplified implementation focusing on correctness over performance.
 * For production use with better quality/size, the OffscreenCanvas API is preferred.
 */
export declare class JPEGEncoder {
    private quality;
    private luminanceQuantTable;
    private chrominanceQuantTable;
    private dcLuminanceHuffman;
    private acLuminanceHuffman;
    private dcChrominanceHuffman;
    private acChrominanceHuffman;
    constructor(quality?: number);
    private initQuantizationTables;
    private initHuffmanTables;
    private buildHuffmanTable;
    encode(width: number, height: number, rgba: Uint8Array, dpiX?: number, dpiY?: number): Uint8Array;
    private writeAPP0;
    private writeDQT;
    private writeSOF0;
    private writeDHT;
    private writeHuffmanTable;
    private writeSOS;
    private encodeScan;
    private encodeBlock;
    private forwardDCT;
    private encodeDC;
    private encodeAC;
}
//# sourceMappingURL=jpeg_encoder.d.ts.map