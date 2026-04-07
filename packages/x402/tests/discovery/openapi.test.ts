/**
 * OpenAPI Discovery Tests
 *
 * Tests the OpenAPI 3.1 document generator:
 * - Generates valid OpenAPI 3.1 structure
 * - Maps resources to operations with x-payment-info
 * - Falls back to defaultPrice when resource has no price
 * - Defaults method to GET
 * - Includes inputSchema as requestBody
 * - Includes guidance in info.x-guidance
 * - Handles empty resources array
 */

import { describe, it, expect } from "vitest";

import { generateOpenApiDocument } from "../../src/discovery/openapi.js";
import type { X402Config } from "../../src/types.js";

const baseConfig: X402Config = {
	payTo: "0xTestWallet",
	network: "eip155:8453",
	defaultPrice: "$0.01",
};

describe("generateOpenApiDocument", () => {
	it("generates a valid OpenAPI 3.1 document", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/article", description: "An article" }],
		});

		expect(doc.openapi).toBe("3.1.0");
		expect(doc.info.title).toBe("x402-protected API");
		expect(doc.info.version).toBe("1.0.0");
		expect(doc.components.securitySchemes).toEqual({
			x402: {
				type: "apiKey",
				in: "header",
				name: "PAYMENT-SIGNATURE",
				description: expect.any(String),
			},
		});
	});

	it("maps resources to OpenAPI operations with x-payment-info", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [
				{
					path: "/premium",
					price: "$0.05",
					description: "Premium content",
					summary: "Get premium content",
				},
			],
		});

		const op = doc.paths["/premium"]?.get as Record<string, unknown>;
		expect(op).toBeDefined();
		expect(op.summary).toBe("Get premium content");
		expect(op.description).toBe("Premium content");
		expect(op.security).toEqual([{ x402: [] }]);

		const paymentInfo = op["x-payment-info"] as Record<string, unknown>;
		expect(paymentInfo.price).toEqual({ mode: "fixed", currency: "USD", amount: "0.05" });
		expect(paymentInfo.protocols).toEqual([{ x402: {} }]);
		expect(paymentInfo.network).toBe("eip155:8453");
		expect(paymentInfo.payTo).toBe("0xTestWallet");

		const responses = op.responses as Record<string, unknown>;
		expect(responses["402"]).toEqual({ description: "Payment Required" });
		expect(responses["200"]).toBeDefined();
	});

	it("falls back to defaultPrice when resource has no price", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			defaultPrice: "$0.10",
			resources: [{ path: "/content" }],
		});

		const op = doc.paths["/content"]?.get as Record<string, unknown>;
		const paymentInfo = op["x-payment-info"] as Record<string, unknown>;
		expect(paymentInfo.price).toEqual({ mode: "fixed", currency: "USD", amount: "0.10" });
	});

	it("defaults method to GET", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/data" }],
		});

		expect(doc.paths["/data"]?.get).toBeDefined();
		expect(doc.paths["/data"]?.post).toBeUndefined();
	});

	it("uses the specified HTTP method", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/api/data", method: "POST" }],
		});

		expect(doc.paths["/api/data"]?.post).toBeDefined();
		expect(doc.paths["/api/data"]?.get).toBeUndefined();
	});

	it("includes inputSchema as requestBody", () => {
		const schema = {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		};

		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/search", method: "POST", inputSchema: schema }],
		});

		const op = doc.paths["/search"]?.post as Record<string, unknown>;
		expect(op.requestBody).toEqual({
			required: true,
			content: {
				"application/json": { schema },
			},
		});
	});

	it("includes mimeType in the 200 response", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/page", mimeType: "text/html" }],
		});

		const op = doc.paths["/page"]?.get as Record<string, unknown>;
		const responses = op.responses as Record<string, Record<string, unknown>>;
		expect(responses["200"].content).toEqual({
			"text/html": { schema: {} },
		});
	});

	it("includes guidance in info.x-guidance", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			guidance: "This API serves premium articles.",
			resources: [{ path: "/article" }],
		});

		expect(doc.info["x-guidance"]).toBe("This API serves premium articles.");
	});

	it("omits x-guidance when guidance is not provided", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/article" }],
		});

		expect(doc.info["x-guidance"]).toBeUndefined();
	});

	it("handles empty resources array", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [],
		});

		expect(doc.paths).toEqual({});
	});

	it("handles missing resources", () => {
		const doc = generateOpenApiDocument(baseConfig);

		expect(doc.paths).toEqual({});
	});

	it("handles numeric price", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/data", price: 0.05 }],
		});

		const op = doc.paths["/data"]?.get as Record<string, unknown>;
		const paymentInfo = op["x-payment-info"] as Record<string, unknown>;
		expect(paymentInfo.price).toEqual({ mode: "fixed", currency: "USD", amount: "0.05" });
	});

	it("handles structured price object", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [
				{
					path: "/data",
					price: { amount: "100000", asset: "0xUSDC" },
				},
			],
		});

		const op = doc.paths["/data"]?.get as Record<string, unknown>;
		const paymentInfo = op["x-payment-info"] as Record<string, unknown>;
		expect(paymentInfo.price).toEqual({ mode: "fixed", currency: "USD", amount: "100000" });
	});

	it("includes facilitatorUrl when configured", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			facilitatorUrl: "https://custom-facilitator.com",
			resources: [{ path: "/data" }],
		});

		const op = doc.paths["/data"]?.get as Record<string, unknown>;
		const paymentInfo = op["x-payment-info"] as Record<string, unknown>;
		expect(paymentInfo.facilitatorUrl).toBe("https://custom-facilitator.com");
	});

	it("omits facilitatorUrl when not configured", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [{ path: "/data" }],
		});

		const op = doc.paths["/data"]?.get as Record<string, unknown>;
		const paymentInfo = op["x-payment-info"] as Record<string, unknown>;
		expect(paymentInfo.facilitatorUrl).toBeUndefined();
	});

	it("supports multiple resources on the same path with different methods", () => {
		const doc = generateOpenApiDocument({
			...baseConfig,
			resources: [
				{ path: "/api/items", method: "GET", description: "List items" },
				{ path: "/api/items", method: "POST", description: "Create item" },
			],
		});

		expect(doc.paths["/api/items"]?.get).toBeDefined();
		expect(doc.paths["/api/items"]?.post).toBeDefined();
	});
});
