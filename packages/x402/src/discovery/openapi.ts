/**
 * OpenAPI 3.1 Document Generator for x402 Discovery
 *
 * Builds an OpenAPI spec from the declarative `resources` config.
 * Each resource becomes an operation with x-payment-info metadata
 * so agents can discover pricing and payment protocols.
 */

import type { Price, X402Config } from "../types.js";

interface OpenApiDocument {
	openapi: string;
	info: Record<string, unknown>;
	paths: Record<string, Record<string, unknown>>;
	components: Record<string, unknown>;
}

/**
 * Generate an OpenAPI 3.1 document from the x402 config.
 * Returns a plain object ready to be serialized to JSON.
 */
export function generateOpenApiDocument(config: X402Config): OpenApiDocument {
	const resources = config.resources ?? [];

	const paths: Record<string, Record<string, unknown>> = {};

	for (const resource of resources) {
		const method = (resource.method ?? "GET").toLowerCase();
		const path = resource.path;
		const price = resource.price ?? config.defaultPrice;

		const operation: Record<string, unknown> = {
			summary: resource.summary ?? resource.description ?? path,
			...(resource.description ? { description: resource.description } : {}),
			security: [{ x402: [] }],
			"x-payment-info": buildPaymentInfo(price, config),
			responses: {
				"200": {
					description: "Success",
					...(resource.mimeType ? { content: { [resource.mimeType]: { schema: {} } } } : {}),
				},
				"402": {
					description: "Payment Required",
				},
			},
		};

		if (resource.inputSchema) {
			operation.requestBody = {
				required: true,
				content: {
					"application/json": {
						schema: resource.inputSchema,
					},
				},
			};
		}

		if (!paths[path]) {
			paths[path] = {};
		}
		paths[path][method] = operation;
	}

	const info: Record<string, unknown> = {
		title: "x402-protected API",
		version: "1.0.0",
	};

	if (config.guidance) {
		info["x-guidance"] = config.guidance;
	}

	return {
		openapi: "3.1.0",
		info,
		paths,
		components: {
			securitySchemes: {
				x402: {
					type: "apiKey",
					in: "header",
					name: "PAYMENT-SIGNATURE",
					description:
						"x402 payment signature. Obtain by signing a payment matching the x-payment-info requirements.",
				},
			},
		},
	};
}

/**
 * Build the x-payment-info extension object for an operation.
 */
function buildPaymentInfo(price: Price | undefined, config: X402Config): Record<string, unknown> {
	const info: Record<string, unknown> = {
		protocols: [{ x402: {} }],
	};

	if (price != null) {
		info.price = normalizePriceForSpec(price);
	}

	info.network = config.network;
	info.payTo = config.payTo;

	if (config.facilitatorUrl) {
		info.facilitatorUrl = config.facilitatorUrl;
	}

	return info;
}

/**
 * Convert a user-friendly Price into the structured format
 * expected by x-payment-info.
 */
function normalizePriceForSpec(price: Price): Record<string, unknown> {
	if (typeof price === "object" && "amount" in price) {
		return { mode: "fixed", currency: "USD", amount: price.amount };
	}

	const str = typeof price === "number" ? String(price) : price;
	const amount = str.startsWith("$") ? str.slice(1) : str;
	return { mode: "fixed", currency: "USD", amount };
}
