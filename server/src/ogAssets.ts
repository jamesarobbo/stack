import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import bold from '../assets/Inter_700Bold.ttf';
import medium from '../assets/Inter_500Medium.ttf';
import type { OgAssets } from './og';

/** Loaded only by the Worker bundle. Wrangler imports .wasm as a module and .ttf as bytes (see wrangler.toml rules). */
export const OG_ASSETS: OgAssets = { wasm, fonts: [new Uint8Array(bold), new Uint8Array(medium)] };
