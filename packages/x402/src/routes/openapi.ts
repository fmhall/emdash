/**
 * OpenAPI Discovery Route
 *
 * Serves GET /openapi.json with the generated OpenAPI 3.1 document.
 * Injected by the x402 integration when `resources` are declared.
 */

import type { APIRoute } from "astro";
// @ts-ignore -- virtual module, resolved at build time
import x402Config from "virtual:x402/config";

import { generateOpenApiDocument } from "../discovery/openapi.js";
import type { X402Config } from "../types.js";

export const prerender = false;

// eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- virtual module import has no type info
const config: X402Config = x402Config as X402Config;

let cachedSpec: string | null = null;

export const GET: APIRoute = async () => {
	if (!cachedSpec) {
		const doc = generateOpenApiDocument(config);
		cachedSpec = JSON.stringify(doc);
	}

	return new Response(cachedSpec, {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=3600",
			"Access-Control-Allow-Origin": "*",
		},
	});
};
