import { expose } from 'comlink';
import webp_enc, { WebPModule } from '../../../codecs/webp_enc/webp_enc';
// Using require() so TypeScript doesn’t complain about this not being a module.
import { EncodeOptions } from './encoder';
const wasmBinaryUrl = require('../../../codecs/webp_enc/webp_enc.wasm');

export default class WebPEncoder {
  private emscriptenModule: Promise<WebPModule>;

  constructor() {
    this.emscriptenModule = new Promise((resolve) => {
      const m = webp_enc({
        // Just to be safe, don’t automatically invoke any wasm functions
        noInitialRun: false,
        locateFile(url: string): string {
          // Redirect the request for the wasm binary to whatever webpack gave us.
          if (url.endsWith('.wasm')) {
            return wasmBinaryUrl;
          }
          return url;
        },
        onRuntimeInitialized() {
          // An Emscripten is a then-able that, for some reason, `then()`s itself,
          // causing an infite loop when you wrap it in a real promise. Deleten the `then`
          // prop solves this for now.
          // See: https://github.com/kripken/emscripten/blob/incoming/src/postamble.js#L129
          // TODO(surma@): File a bug with Emscripten on this.
          delete (m as any).then;
          resolve(m);
        },
      });
    });
  }

  async encode(data: ImageData, options: EncodeOptions): Promise<ArrayBuffer> {
    const module = await this.emscriptenModule;

    const resultView = module.encode(data.data, data.width, data.height, options);
    const result = new Uint8Array(resultView);
    module.free_result();

    return result.buffer as ArrayBuffer;
  }
}

expose(WebPEncoder, self);
