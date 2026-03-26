import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	integrations: [react(), mdx()],
	adapter: cloudflare(),
	vite: {
		plugins: [tailwindcss()],
	},
});
