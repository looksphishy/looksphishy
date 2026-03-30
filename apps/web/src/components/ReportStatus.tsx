import { useState, useEffect } from "react";

const apiUrl = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3001";

interface RelayResult {
	provider: string;
	status: string;
	attemptedAt: string | null;
}

interface ReportData {
	id: string;
	url: string;
	status: string;
	source: string;
	createdAt: string;
	relayResults: RelayResult[];
	error?: string;
}

const PROVIDER_INFO: Record<string, { label: string; description: string }> = {
	google: { label: "Google Web Risk", description: "Chrome, Firefox, Safari, Android" },
	netcraft: { label: "Netcraft", description: "Phishing takedowns" },
	cloudflare: { label: "Cloudflare", description: "Cloudflare-proxied sites" },
	registrar: { label: "Domain Registrar", description: "Domain suspension" },
	hosting: { label: "Hosting Provider", description: "Content takedown" },
};

const PROGRESS_STEPS = [
	{ key: "verifying", label: "Verifying", activeOn: ["pending", "verifying"] },
	{ key: "relaying", label: "Relaying", activeOn: ["verified", "relaying"] },
	{ key: "completed", label: "Done", activeOn: ["completed"] },
] as const;

function getProgress(status: string): { stepIndex: number; isDone: boolean } {
	if (status === "pending" || status === "verifying") return { stepIndex: 0, isDone: false };
	if (status === "verified" || status === "relaying") return { stepIndex: 1, isDone: false };
	if (status === "completed") return { stepIndex: 2, isDone: true };
	return { stepIndex: -1, isDone: false };
}

function RelayStatusIcon({ status }: { status: string }) {
	switch (status) {
		case "submitted":
		case "accepted":
			return (
				<div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
					<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			);
		case "failed":
			return (
				<div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
					<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
			);
		case "skipped":
			return (
				<div className="flex size-8 items-center justify-center rounded-lg bg-zinc-500/10 text-zinc-400">
					<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
					</svg>
				</div>
			);
		default:
			return (
				<div className="flex size-8 items-center justify-center rounded-lg bg-zinc-500/5">
					<div className="size-2 animate-pulse rounded-full bg-zinc-400" />
				</div>
			);
	}
}

function relayStatusLabel(status: string): string {
	switch (status) {
		case "pending": return "Waiting...";
		case "submitted": return "Submitted";
		case "accepted": return "Accepted";
		case "failed": return "Failed";
		case "skipped": return "Skipped";
		default: return status;
	}
}

function sourceLabel(source: string): string {
	switch (source) {
		case "web": return "Web form";
		case "email": return "Email forward";
		case "api": return "API";
		default: return source;
	}
}

export function ReportStatus({ reportId }: { reportId: string }) {
	const [report, setReport] = useState<ReportData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const eventSource = new EventSource(
			`${apiUrl}/api/reports/${reportId}/stream`,
		);

		eventSource.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.error) {
				setError(data.error);
				eventSource.close();
				return;
			}
			setReport(data);
		};

		eventSource.onerror = () => {
			eventSource.close();
		};

		return () => eventSource.close();
	}, [reportId]);

	if (error) {
		return (
			<div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center">
				<div className="text-4xl">🐟</div>
				<p className="mt-4 text-lg font-semibold text-foreground">Report not found</p>
				<p className="mt-1 text-sm text-muted-foreground">
					This report ID doesn't exist or may have expired.
				</p>
			</div>
		);
	}

	if (!report) {
		return (
			<div className="rounded-2xl border border-border bg-card p-10">
				<div className="flex items-center justify-center gap-3 text-muted-foreground">
					<div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					Loading report...
				</div>
			</div>
		);
	}

	const { stepIndex, isDone } = getProgress(report.status);
	const isRejected = report.status === "rejected";
	const isCompleted = report.status === "completed";
	const submittedCount = report.relayResults.filter(
		(r) => r.status === "submitted" || r.status === "accepted",
	).length;
	const domain = (() => {
		try { return new URL(report.url).hostname; } catch { return null; }
	})();

	return (
		<div className="space-y-4">
			{/* Header with URL */}
			<div className="rounded-2xl border border-border bg-card overflow-hidden">
				<div className="border-b border-border bg-muted/30 px-5 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-lg">🐟</span>
							<h1 className="text-sm font-semibold text-foreground">Report Status</h1>
						</div>
						<span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
							{sourceLabel(report.source)}
						</span>
					</div>
				</div>
				<div className="px-5 py-4">
					<div className="flex items-start gap-3">
						<div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
							<svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
							</svg>
						</div>
						<div className="min-w-0 flex-1">
							{domain && (
								<p className="text-xs font-medium text-muted-foreground">{domain}</p>
							)}
							<p className="mt-0.5 break-all font-mono text-sm leading-relaxed text-foreground">
								{report.url}
							</p>
							<p className="mt-2 text-xs text-muted-foreground">
								Reported {new Date(report.createdAt).toLocaleDateString(undefined, {
									year: "numeric",
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* 3-step progress bar — hidden when completed */}
			{!isCompleted && !isRejected && (
				<div className="rounded-2xl border border-border bg-card px-5 py-4">
					<div className="relative flex justify-between">
						{/* Background line */}
						<div className="absolute left-0 right-0 top-[18px] mx-[18px] h-0.5 rounded-full bg-muted" />
						{/* Filled line */}
						<div
							className="absolute left-0 top-[18px] mx-[18px] h-0.5 rounded-full bg-green-500 transition-all duration-500"
							style={{ width: stepIndex <= 0 ? "0%" : stepIndex >= 2 ? "calc(100% - 36px)" : "calc(50% - 18px)" }}
						/>
						{/* Steps */}
						{PROGRESS_STEPS.map((step, i) => {
							const isCurrent = i === stepIndex;
							const isPast = i < stepIndex;
							return (
								<div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
									<div
										className={`flex size-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
											isPast
												? "bg-green-500 text-white"
												: isCurrent
													? "bg-primary text-white ring-4 ring-primary/20"
													: "bg-muted text-muted-foreground"
										}`}
									>
										{isPast ? (
											<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										) : (
											i + 1
										)}
									</div>
									<span
										className={`text-xs font-medium ${
											isPast || isCurrent ? "text-foreground" : "text-muted-foreground"
										}`}
									>
										{step.label}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Rejected state */}
			{isRejected && (
				<div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
							<svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<div>
							<p className="font-medium text-foreground">Not classified as phishing</p>
							<p className="mt-0.5 text-sm text-muted-foreground">
								Our verification didn't confirm this as a phishing site. No reports were sent.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Completed banner */}
			{isCompleted && (
				<div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-green-500/15 text-green-500">
							<svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<div>
							<p className="font-medium text-foreground">Report complete</p>
							<p className="mt-0.5 text-sm text-muted-foreground">
								Verified and relayed to {submittedCount} provider{submittedCount !== 1 ? "s" : ""}.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Relay results */}
			{report.relayResults.length > 0 && (
				<div className="rounded-2xl border border-border bg-card overflow-hidden">
					<div className="border-b border-border bg-muted/30 px-5 py-3">
						<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Relay Providers
						</h2>
					</div>
					<div className="divide-y divide-border">
						{report.relayResults.map((relay) => {
							const info = PROVIDER_INFO[relay.provider] ?? {
								label: relay.provider,
								description: "",
							};
							return (
								<div
									key={relay.provider}
									className="flex items-center justify-between px-5 py-3.5"
								>
									<div className="flex items-center gap-3">
										<RelayStatusIcon status={relay.status} />
										<div>
											<p className="text-sm font-medium text-foreground">
												{info.label}
											</p>
											<p className="text-xs text-muted-foreground">
												{info.description}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className={`text-xs font-medium ${
											relay.status === "submitted" || relay.status === "accepted"
												? "text-green-500"
												: relay.status === "failed"
													? "text-red-500"
													: "text-muted-foreground"
										}`}>
											{relayStatusLabel(relay.status)}
										</p>
										{relay.attemptedAt && (
											<p className="text-[10px] text-muted-foreground">
												{new Date(relay.attemptedAt).toLocaleTimeString()}
											</p>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Report ID footer */}
			<p className="text-center font-mono text-[10px] text-muted-foreground/60">
				{report.id}
			</p>
		</div>
	);
}
