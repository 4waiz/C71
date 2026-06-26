import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// Run the Next build directly (not `npm run build`) so that pointing the npm
// `build` script at `opennextjs-cloudflare build` does not recurse into itself.
// This lets Cloudflare Workers Builds use `npm run build` and still produce the
// compiled OpenNext bundle that `wrangler deploy` needs.
(config as { buildCommand?: string }).buildCommand = "next build";

export default config;
