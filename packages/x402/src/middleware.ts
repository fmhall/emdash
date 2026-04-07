/**
 * x402 Astro Middleware
 *
 * Injected by the x402 integration. Creates the enforcer and
 * places it on Astro.locals.x402 for use in page frontmatter.
 *
 * The config is passed via the virtual module resolved by the integration.
 */

import { defineMiddleware } from "astro:middleware";
import x402Config from "virtual:x402/config";

import { createEnforcer } from "./enforcer.js";

const enforcer = createEnforcer(x402Config);

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.x402 = enforcer;
	return next();
});
