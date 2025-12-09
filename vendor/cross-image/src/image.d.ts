import type { ImageFormat, ImageMetadata, MultiFrameImageData, ResizeOptions } from "./types.js";
/**
 * Main Image class for reading, manipulating, and saving images
 */
export declare class Image {
    private imageData;
    private static formats;
    /**
     * Get the current image width
     */
    get width(): number;
    /**
     * Get the current image height
     */
    get height(): number;
    /**
     * Get the current image data
     */
    get data(): Uint8Array;
    /**
     * Get the current image metadata
     */
    get metadata(): ImageMetadata | undefined;
    /**
     * Set or update image metadata
     * @param metadata Metadata to set or merge
     * @param merge If true, merges with existing metadata. If false, replaces it. Default: true
     */
    setMetadata(metadata: ImageMetadata, merge?: boolean): this;
    /**
     * Get a specific metadata field
     * @param key The metadata field to retrieve
     * @returns The metadata value or undefined
     */
    getMetadataField<K extends keyof ImageMetadata>(key: K): ImageMetadata[K] | undefined;
    /**
     * Get position (latitude, longitude) from metadata
     * @returns Object with latitude and longitude, or undefined if not available
     */
    getPosition(): {
        latitude: number;
        longitude: number;
    } | undefined;
    /**
     * Set position (latitude, longitude) in metadata
     * @param latitude GPS latitude
     * @param longitude GPS longitude
     */
    setPosition(latitude: number, longitude: number): this;
    /**
     * Get physical dimensions from metadata
     * @returns Object with DPI and physical dimensions, or undefined if not available
     */
    getDimensions(): {
        dpiX?: number;
        dpiY?: number;
        physicalWidth?: number;
        physicalHeight?: number;
    } | undefined;
    /**
     * Set physical dimensions in metadata
     * @param dpiX Dots per inch (horizontal)
     * @param dpiY Dots per inch (vertical), defaults to dpiX if not provided
     */
    setDPI(dpiX: number, dpiY?: number): this;
    /**
     * Register a custom image format
     * @param format Custom format implementation
     */
    static registerFormat(format: ImageFormat): void;
    /**
     * Get all registered formats
     */
    static getFormats(): readonly ImageFormat[];
    /**
     * Decode an image from bytes
     * @param data Raw image data
     * @param format Optional format hint (e.g., "png", "jpeg", "webp")
     * @returns Image instance
     */
    static decode(data: Uint8Array, format?: string): Promise<Image>;
    /**
     * Read an image from bytes
     * @deprecated Use `decode()` instead. This method will be removed in a future version.
     * @param data Raw image data
     * @param format Optional format hint (e.g., "png", "jpeg", "webp")
     * @returns Image instance
     */
    static read(data: Uint8Array, format?: string): Promise<Image>;
    /**
     * Decode all frames from a multi-frame image (GIF animation, multi-page TIFF)
     * @param data Raw image data
     * @param format Optional format hint (e.g., "gif", "tiff")
     * @returns MultiFrameImageData with all frames
     */
    static decodeFrames(data: Uint8Array, format?: string): Promise<MultiFrameImageData>;
    /**
     * Read all frames from a multi-frame image (GIF animation, multi-page TIFF)
     * @deprecated Use `decodeFrames()` instead. This method will be removed in a future version.
     * @param data Raw image data
     * @param format Optional format hint (e.g., "gif", "tiff")
     * @returns MultiFrameImageData with all frames
     */
    static readFrames(data: Uint8Array, format?: string): Promise<MultiFrameImageData>;
    /**
     * Encode multi-frame image data to bytes in the specified format
     * @param format Format name (e.g., "gif", "tiff")
     * @param imageData Multi-frame image data to encode
     * @param options Optional format-specific encoding options
     * @returns Encoded image bytes
     */
    static encodeFrames(format: string, imageData: MultiFrameImageData, options?: unknown): Promise<Uint8Array>;
    /**
     * Save multi-frame image data to bytes in the specified format
     * @deprecated Use `encodeFrames()` instead. This method will be removed in a future version.
     * @param format Format name (e.g., "gif", "tiff")
     * @param imageData Multi-frame image data to encode
     * @param options Optional format-specific encoding options
     * @returns Encoded image bytes
     */
    static saveFrames(format: string, imageData: MultiFrameImageData, options?: unknown): Promise<Uint8Array>;
    /**
     * Create an image from raw RGBA data
     * @param width Image width
     * @param height Image height
     * @param data Raw RGBA pixel data (4 bytes per pixel)
     * @returns Image instance
     */
    static fromRGBA(width: number, height: number, data: Uint8Array): Image;
    /**
     * Create a blank image with the specified dimensions and color
     * @param width Image width
     * @param height Image height
     * @param r Red component (0-255, default: 0)
     * @param g Green component (0-255, default: 0)
     * @param b Blue component (0-255, default: 0)
     * @param a Alpha component (0-255, default: 255)
     * @returns Image instance
     */
    static create(width: number, height: number, r?: number, g?: number, b?: number, a?: number): Image;
    /**
     * Resize the image
     * @param options Resize options
     * @returns This image instance for chaining
     */
    resize(options: ResizeOptions): this;
    /**
     * Encode the image to bytes in the specified format
     * @param format Format name (e.g., "png", "jpeg", "webp", "ascii")
     * @param options Optional format-specific encoding options
     * @returns Encoded image bytes
     */
    encode(format: string, options?: unknown): Promise<Uint8Array>;
    /**
     * Save the image to bytes in the specified format
     * @deprecated Use `encode()` instead. This method will be removed in a future version.
     * @param format Format name (e.g., "png", "jpeg", "webp", "ascii")
     * @param options Optional format-specific encoding options
     * @returns Encoded image bytes
     */
    save(format: string, options?: unknown): Promise<Uint8Array>;
    /**
     * Clone this image
     * @returns New image instance with copied data and metadata
     */
    clone(): Image;
    /**
     * Composite another image on top of this image at the specified position
     * @param overlay Image to place on top
     * @param x X position (can be negative)
     * @param y Y position (can be negative)
     * @param opacity Opacity of overlay (0-1, default: 1)
     * @returns This image instance for chaining
     */
    composite(overlay: Image, x: number, y: number, opacity?: number): this;
    /**
     * Adjust brightness of the image
     * @param amount Brightness adjustment (-1 to 1, where 0 is no change)
     * @returns This image instance for chaining
     */
    brightness(amount: number): this;
    /**
     * Adjust contrast of the image
     * @param amount Contrast adjustment (-1 to 1, where 0 is no change)
     * @returns This image instance for chaining
     */
    contrast(amount: number): this;
    /**
     * Adjust exposure of the image
     * @param amount Exposure adjustment in stops (-3 to 3, where 0 is no change)
     * @returns This image instance for chaining
     */
    exposure(amount: number): this;
    /**
     * Adjust saturation of the image
     * @param amount Saturation adjustment (-1 to 1, where 0 is no change)
     * @returns This image instance for chaining
     */
    saturation(amount: number): this;
    /**
     * Invert colors of the image
     * @returns This image instance for chaining
     */
    invert(): this;
    /**
     * Convert the image to grayscale
     * @returns This image instance for chaining
     */
    grayscale(): this;
    /**
     * Apply sepia tone effect to the image
     * @returns This image instance for chaining
     */
    sepia(): this;
    /**
     * Apply box blur filter to the image
     * @param radius Blur radius (default: 1)
     * @returns This image instance for chaining
     */
    blur(radius?: number): this;
    /**
     * Apply Gaussian blur filter to the image
     * @param radius Blur radius (default: 1)
     * @param sigma Optional standard deviation (if not provided, calculated from radius)
     * @returns This image instance for chaining
     */
    gaussianBlur(radius?: number, sigma?: number): this;
    /**
     * Apply sharpen filter to the image
     * @param amount Sharpening amount (0-1, default: 0.5)
     * @returns This image instance for chaining
     */
    sharpen(amount?: number): this;
    /**
     * Apply median filter to reduce noise
     * @param radius Filter radius (default: 1)
     * @returns This image instance for chaining
     */
    medianFilter(radius?: number): this;
    /**
     * Fill a rectangular region with a color
     * @param x Starting X position
     * @param y Starting Y position
     * @param width Width of the fill region
     * @param height Height of the fill region
     * @param r Red component (0-255)
     * @param g Green component (0-255)
     * @param b Blue component (0-255)
     * @param a Alpha component (0-255, default: 255)
     * @returns This image instance for chaining
     */
    fillRect(x: number, y: number, width: number, height: number, r: number, g: number, b: number, a?: number): this;
    /**
     * Crop the image to a rectangular region
     * @param x Starting X position
     * @param y Starting Y position
     * @param width Width of the crop region
     * @param height Height of the crop region
     * @returns This image instance for chaining
     */
    crop(x: number, y: number, width: number, height: number): this;
    /**
     * Get the pixel color at the specified position
     * @param x X position
     * @param y Y position
     * @returns Object with r, g, b, a components (0-255) or undefined if out of bounds
     */
    getPixel(x: number, y: number): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    /**
     * Set the pixel color at the specified position
     * @param x X position
     * @param y Y position
     * @param r Red component (0-255)
     * @param g Green component (0-255)
     * @param b Blue component (0-255)
     * @param a Alpha component (0-255, default: 255)
     * @returns This image instance for chaining
     */
    setPixel(x: number, y: number, r: number, g: number, b: number, a?: number): this;
}
//# sourceMappingURL=image.d.ts.map