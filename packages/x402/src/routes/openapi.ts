/**
 * OpenAPI Discovery Route
 *
 * Serves GET /openapi.json with the generated OpenAPI 3.1 document.
 * Injected by the x402 integration when `resources` are declared.
 */

import type { APIRoute } from "astro";
import x402Config from "virtual:x402/config";

import { generateOpenApiDocument } from "../discovery/openapi.js";

export const prerender = false;

let cachedSpec: string | null = null;

export const GET: APIRoute = async () => {
	if (!cachedSpec) {
		const doc = generateOpenApiDocument(x402Config);
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
