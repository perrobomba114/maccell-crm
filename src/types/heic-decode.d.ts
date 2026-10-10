declare module "heic-decode" {
    interface DecodedImage {
        width: number;
        height: number;
        data: Uint8ClampedArray;
    }
    interface DecodableImage {
        width: number;
        height: number;
        decode(): Promise<DecodedImage>;
    }
    interface ImageBatch extends Array<DecodableImage> {
        dispose(): void;
    }
    function decode(input: { buffer: Uint8Array }): Promise<DecodedImage>;
    namespace decode {
        // heic-decode/lib.js exposes dimensions and dispose on the lazy batch.
        function all(input: { buffer: Uint8Array }): Promise<ImageBatch>;
    }
    export = decode;
}
