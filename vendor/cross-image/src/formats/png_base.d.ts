import type { ImageMetadata } from "../types.js";
/**
 * Base class for PNG and APNG format handlers
 * Contains shared utility methods for PNG chunk manipulation and metadata parsing
 */
export declare abstract class PNGBase {
    /**
     * Read a 32-bit unsigned integer (big-endian)
     */
    protected readUint32(data: Uint8Array, offset: number): number;
    /**
     * Read a 16-bit unsigned integer (big-endian)
     */
    protected readUint16(data: Uint8Array, offset: number): number;
    /**
     * Write a 32-bit unsigned integer (big-endian)
     */
    protected writeUint32(data: Uint8Array, offset: number, value: number): void;
    /**
     * Write a 16-bit unsigned integer (big-endian)
     */
    protected writeUint16(data: Uint8Array, offset: number, value: number): void;
    /**
     * Decompress PNG data using deflate
     */
    protected inflate(data: Uint8Array): Promise<Uint8Array>;
    /**
     * Compress PNG data using deflate
     */
    protected deflate(data: Uint8Array): Promise<Uint8Array>;
    /**
     * Unfilter PNG scanlines and convert to RGBA
     */
    protected unfilterAndConvert(data: Uint8Array, width: number, height: number, bitDepth: number, colorType: number): Uint8Array;
    /**
     * Unfilter a single PNG scanline
     */
    protected unfilterScanline(scanline: Uint8Array, prevLine: Uint8Array | null, filterType: number, bytesPerPixel: number): void;
    /**
     * Paeth predictor for PNG filtering
     */
    protected paethPredictor(a: number, b: number, c: number): number;
    /**
     * Filter PNG data for encoding (using filter type 0 - None)
     */
    protected filterData(data: Uint8Array, width: number, height: number): Uint8Array;
    /**
     * Get bytes per pixel for a given color type and bit depth
     */
    protected getBytesPerPixel(colorType: number, bitDepth: number): number;
    /**
     * Get bits per pixel for a given color type and bit depth
     */
    protected getBitsPerPixel(colorType: number, bitDepth: number): number;
    /**
     * Create a PNG chunk with length, type, data, and CRC
     */
    protected createChunk(type: string, data: Uint8Array): Uint8Array;
    /**
     * Calculate CRC32 checksum
     */
    protected crc32(data: Uint8Array): number;
    /**
     * Parse pHYs (physical pixel dimensions) chunk
     */
    protected parsePhysChunk(data: Uint8Array, metadata: ImageMetadata, width: number, height: number): void;
    /**
     * Parse tEXt (text) chunk
     */
    protected parseTextChunk(data: Uint8Array, metadata: ImageMetadata): void;
    /**
     * Parse iTXt (international text) chunk
     */
    protected parseITxtChunk(data: Uint8Array, metadata: ImageMetadata): void;
    /**
     * Parse eXIf (EXIF) chunk
     */
    protected parseExifChunk(data: Uint8Array, metadata: ImageMetadata): void;
    /**
     * Create pHYs (physical pixel dimensions) chunk
     */
    protected createPhysChunk(metadata: ImageMetadata): Uint8Array;
    /**
     * Create tEXt (text) chunk
     */
    protected createTextChunk(keyword: string, text: string): Uint8Array;
    /**
     * Create eXIf (EXIF) chunk
     */
    protected createExifChunk(metadata: ImageMetadata): Uint8Array | null;
    /**
     * Concatenate multiple byte arrays into a single Uint8Array
     */
    protected concatenateChunks(chunks: {
        type: string;
        data: Uint8Array;
    }[]): Uint8Array;
    /**
     * Concatenate multiple Uint8Arrays into a single Uint8Array
     */
    protected concatenateArrays(arrays: Uint8Array[]): Uint8Array;
    /**
     * Add metadata chunks to the chunks array
     * Shared method to avoid duplication between PNG and APNG encoding
     */
    protected addMetadataChunks(chunks: Uint8Array[], metadata: ImageMetadata | undefined): void;
}
//# sourceMappingURL=png_base.d.ts.map