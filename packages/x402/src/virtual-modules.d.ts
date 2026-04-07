/**
 * Type declarations for x402 virtual modules.
 *
 * The virtual:x402/config module is generated at build time by the
 * Astro integration. This declaration gives TypeScript + IDEs type
 * information so we don't need @ts-ignore or unsafe type assertions.
 */

declare module "virtual:x402/config" {
	import type { X402Config } from "./types.js";

	const config: X402Config;
	export default config;
}
