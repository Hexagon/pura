/**
 * Pure JavaScript GIF decoder implementation
 * Supports GIF87a and GIF89a formats with LZW decompression
 */
interface GIFImage {
    width: number;
    height: number;
    data: Uint8Array;
}
interface GIFFrame {
    width: number;
    height: number;
    left: number;
    top: number;
    data: Uint8Array;
    delay: number;
    disposal: number;
}
export declare class GIFDecoder {
    private data;
    private pos;
    constructor(data: Uint8Array);
    private readByte;
    private readUint16LE;
    private readBytes;
    private readColorTable;
    private readDataSubBlocks;
    decode(): GIFImage;
    /**
     * Decode all frames from an animated GIF
     * @returns Object with canvas dimensions and array of frames
     */
    decodeAllFrames(): {
        width: number;
        height: number;
        frames: GIFFrame[];
    };
    private indexedToRGBA;
    private deinterlace;
}
export {};
//# sourceMappingURL=gif_decoder.d.ts.map