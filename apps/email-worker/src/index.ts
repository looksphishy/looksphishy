import PostalMime from "postal-mime";

interface Env {
	API_URL: string;
	WEBHOOK_SECRET: string;
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext) {
		try {
			const rawEmail = await new Response(message.raw).arrayBuffer();
			const parsed = await new PostalMime().parse(rawEmail);

			const payload = {
				from: parsed.from?.address ?? message.from,
				to: message.to,
				subject: parsed.subject ?? "",
				...(parsed.text && { text: parsed.text }),
				...(parsed.html && { html: parsed.html }),
				headers: Object.fromEntries(message.headers),
			};

			const response = await fetch(
				`${env.API_URL}/api/webhooks/inbound-email`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-webhook-secret": env.WEBHOOK_SECRET,
					},
					body: JSON.stringify(payload),
				},
			);

			if (!response.ok) {
				console.error("Webhook request failed:", response.status);
				message.setReject(`Webhook delivery failed: ${response.status}`);
			}
		} catch (error) {
			console.error("Email processing failed:", error);
			message.setReject("Internal processing error");
		}
	},
} satisfies ExportedHandler<Env>;
