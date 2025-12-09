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
export class TIFFLZWDecoder {
    constructor(data) {
        Object.defineProperty(this, "data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pos", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bitPos", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "codeSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dict", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "clearCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 256
        });
        Object.defineProperty(this, "eoiCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 257
        });
        Object.defineProperty(this, "nextCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 258
        });
        this.data = data;
        this.pos = 0;
        this.bitPos = 0;
        this.codeSize = 9;
        this.dict = [];
        this.initDictionary();
    }
    initDictionary() {
        this.dict = [];
        // Initialize dictionary with single-byte entries (0-255)
        for (let i = 0; i < 256; i++) {
            this.dict[i] = new Uint8Array([i]);
        }
        this.nextCode = 258; // Next available code after clear and EOI
        this.codeSize = 9;
    }
    readCode() {
        if (this.pos >= this.data.length) {
            return null;
        }
        let code = 0;
        // Read bits MSB-first (TIFF bit ordering)
        for (let i = 0; i < this.codeSize; i++) {
            if (this.pos >= this.data.length) {
                return null;
            }
            const byte = this.data[this.pos];
            const bit = (byte >> (7 - this.bitPos)) & 1;
            code = (code << 1) | bit;
            this.bitPos++;
            if (this.bitPos === 8) {
                this.bitPos = 0;
                this.pos++;
            }
        }
        return code;
    }
    decompress() {
        const output = [];
        let prevCode = null;
        while (true) {
            const code = this.readCode();
            if (code === null || code === this.eoiCode) {
                break;
            }
            if (code === this.clearCode) {
                this.initDictionary();
                prevCode = null;
                continue;
            }
            if (code < this.dict.length && this.dict[code]) {
                const entry = this.dict[code];
                output.push(...entry);
                if (prevCode !== null && prevCode < this.dict.length &&
                    this.dict[prevCode]) {
                    const prevEntry = this.dict[prevCode];
                    const newEntry = new Uint8Array(prevEntry.length + 1);
                    newEntry.set(prevEntry);
                    newEntry[prevEntry.length] = entry[0];
                    if (this.nextCode < 4096) {
                        this.dict[this.nextCode] = newEntry;
                        this.nextCode++;
                        // Increase code size when dictionary reaches certain sizes
                        if (this.nextCode === 512 && this.codeSize === 9) {
                            this.codeSize = 10;
                        }
                        else if (this.nextCode === 1024 && this.codeSize === 10) {
                            this.codeSize = 11;
                        }
                        else if (this.nextCode === 2048 && this.codeSize === 11) {
                            this.codeSize = 12;
                        }
                    }
                }
            }
            else if (prevCode !== null && prevCode < this.dict.length && this.dict[prevCode]) {
                // Special case: code not in dictionary yet
                const prevEntry = this.dict[prevCode];
                const newEntry = new Uint8Array(prevEntry.length + 1);
                newEntry.set(prevEntry);
                newEntry[prevEntry.length] = prevEntry[0];
                if (this.nextCode < 4096) {
                    this.dict[this.nextCode] = newEntry;
                    this.nextCode++;
                    // Increase code size when dictionary reaches certain sizes
                    if (this.nextCode === 512 && this.codeSize === 9) {
                        this.codeSize = 10;
                    }
                    else if (this.nextCode === 1024 && this.codeSize === 10) {
                        this.codeSize = 11;
                    }
                    else if (this.nextCode === 2048 && this.codeSize === 11) {
                        this.codeSize = 12;
                    }
                }
                output.push(...newEntry);
            }
            prevCode = code;
        }
        return new Uint8Array(output);
    }
}
/**
 * LZW Encoder for TIFF images
 */
export class TIFFLZWEncoder {
    constructor() {
        Object.defineProperty(this, "codeSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dict", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "output", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bitBuffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bitCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "clearCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 256
        });
        Object.defineProperty(this, "eoiCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 257
        });
        Object.defineProperty(this, "nextCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 258
        });
        this.codeSize = 9;
        this.dict = new Map();
        this.output = [];
        this.bitBuffer = 0;
        this.bitCount = 0;
        this.initDictionary();
    }
    initDictionary() {
        this.dict.clear();
        // Initialize dictionary with single-byte entries
        for (let i = 0; i < 256; i++) {
            this.dict.set(String.fromCharCode(i), i);
        }
        this.nextCode = 258;
        this.codeSize = 9;
    }
    writeCode(code) {
        // Write bits MSB-first (TIFF bit ordering)
        for (let i = this.codeSize - 1; i >= 0; i--) {
            const bit = (code >> i) & 1;
            this.bitBuffer = (this.bitBuffer << 1) | bit;
            this.bitCount++;
            if (this.bitCount === 8) {
                this.output.push(this.bitBuffer & 0xff);
                this.bitBuffer = 0;
                this.bitCount = 0;
            }
        }
    }
    compress(data) {
        this.initDictionary();
        this.output = [];
        this.bitBuffer = 0;
        this.bitCount = 0;
        // Write clear code
        this.writeCode(this.clearCode);
        let buffer = "";
        for (let i = 0; i < data.length; i++) {
            const k = String.fromCharCode(data[i]);
            const bufferK = buffer + k;
            if (this.dict.has(bufferK)) {
                buffer = bufferK;
            }
            else {
                // Output code for buffer
                const code = this.dict.get(buffer);
                if (code !== undefined) {
                    this.writeCode(code);
                }
                // Add new entry to dictionary
                if (this.nextCode < 4096) {
                    this.dict.set(bufferK, this.nextCode);
                    this.nextCode++;
                    // Increase code size when needed
                    if (this.nextCode === 512 && this.codeSize === 9) {
                        this.codeSize = 10;
                    }
                    else if (this.nextCode === 1024 && this.codeSize === 10) {
                        this.codeSize = 11;
                    }
                    else if (this.nextCode === 2048 && this.codeSize === 11) {
                        this.codeSize = 12;
                    }
                    // Reset when dictionary is full
                    if (this.nextCode === 4096) {
                        this.writeCode(this.clearCode);
                        this.initDictionary();
                    }
                }
                buffer = k;
            }
        }
        // Output final code
        if (buffer.length > 0) {
            const code = this.dict.get(buffer);
            if (code !== undefined) {
                this.writeCode(code);
            }
        }
        // Write end code
        this.writeCode(this.eoiCode);
        // Flush remaining bits
        if (this.bitCount > 0) {
            this.bitBuffer <<= 8 - this.bitCount;
            this.output.push(this.bitBuffer & 0xff);
        }
        return new Uint8Array(this.output);
    }
}
