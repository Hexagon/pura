/**
 * Shared byte-level read/write utilities for image formats
 * These functions handle reading and writing multi-byte integers
 * in little-endian byte order, commonly used in BMP, ICO, GIF, and other formats.
 */
/**
 * Read a 16-bit unsigned integer in little-endian format
 */
export declare function readUint16LE(data: Uint8Array, offset: number): number;
/**
 * Read a 32-bit unsigned integer in little-endian format
 */
export declare function readUint32LE(data: Uint8Array, offset: number): number;
/**
 * Read a 32-bit signed integer in little-endian format
 */
export declare function readInt32LE(data: Uint8Array, offset: number): number;
/**
 * Write a 16-bit unsigned integer in little-endian format
 */
export declare function writeUint16LE(data: Uint8Array, offset: number, value: number): void;
/**
 * Write a 32-bit unsigned integer in little-endian format
 */
export declare function writeUint32LE(data: Uint8Array, offset: number, value: number): void;
/**
 * Write a 32-bit signed integer in little-endian format
 */
export declare function writeInt32LE(data: Uint8Array, offset: number, value: number): void;
//# sourceMappingURL=byte_utils.d.ts.map