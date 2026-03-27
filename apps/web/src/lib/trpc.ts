import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@looksphishy/api/trpc";

const apiUrl =
	import.meta.env.PUBLIC_API_URL ?? "http://localhost:3001";

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${apiUrl}/trpc`,
		}),
	],
});
