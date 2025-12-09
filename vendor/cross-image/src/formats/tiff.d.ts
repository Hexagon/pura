import type { ImageData, ImageFormat, MultiFrameImageData } from "../types.js";
/**
 * Options for TIFF encoding
 */
export interface TIFFEncodeOptions {
    /** Compression method: "none" for uncompressed (default), "lzw" for LZW compression */
    compression?: "none" | "lzw";
    /** Encode as grayscale instead of RGB/RGBA */
    grayscale?: boolean;
    /** Encode as RGB without alpha channel (ignored if grayscale is true) */
    rgb?: boolean;
}
/**
 * TIFF format handler
 * Implements pure-JS TIFF decoder for uncompressed and LZW-compressed RGB/RGBA images
 * and encoder for uncompressed and LZW-compressed RGBA TIFFs. Falls back to ImageDecoder
 * for other compressed TIFFs (JPEG, PackBits, etc.)
 * Supports multi-page TIFF files.
 */
export declare class TIFFFormat implements ImageFormat {
    /** Format name identifier */
    readonly name: string;
    /** MIME type for TIFF images */
    readonly mimeType: string;
    /**
     * Check if this format supports multiple frames (pages)
     * @returns true for TIFF format
     */
    supportsMultipleFrames(): boolean;
    /**
     * Check if the given data is a TIFF image
     * @param data Raw image data to check
     * @returns true if data has TIFF signature
     */
    canDecode(data: Uint8Array): boolean;
    /**
     * Decode TIFF image data to RGBA (first page only)
     * @param data Raw TIFF image data
     * @returns Decoded image data with RGBA pixels of first page
     */
    decode(data: Uint8Array): Promise<ImageData>;
    encode(imageData: ImageData, options?: unknown): Promise<Uint8Array>;
    /**
     * Decode all pages from a multi-page TIFF
     */
    decodeFrames(data: Uint8Array): Promise<MultiFrameImageData>;
    /**
     * Encode multi-page TIFF
     */
    encodeFrames(imageData: MultiFrameImageData, options?: unknown): Promise<Uint8Array>;
    /**
     * Decode a single page from TIFF given its IFD offset
     */
    private decodePage;
    /**
     * Extract metadata from an IFD
     */
    private extractMetadataFromIFD;
    protected readUint16(data: Uint8Array, offset: number, isLittleEndian: boolean): number;
    protected readUint32(data: Uint8Array, offset: number, isLittleEndian: boolean): number;
    protected writeUint16LE(result: number[], value: number): void;
    protected writeUint32LE(result: number[], value: number): void;
    protected writeIFDEntry(result: number[], tag: number, type: number, count: number, valueOrOffset: number): void;
    private getIFDValue;
    private decodeUsingRuntime;
    private readString;
    /**
     * Pure JavaScript TIFF decoder for uncompressed and LZW-compressed RGB/RGBA images
     * Returns null if the TIFF uses unsupported features
     */
    private decodePureJS;
    /**
     * Pure JavaScript TIFF decoder for a specific IFD
     * Returns null if the TIFF uses unsupported features
     */
    private decodePureJSFromIFD;
}
//# sourceMappingURL=tiff.d.ts.map