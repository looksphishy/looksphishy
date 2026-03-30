import { useState, useEffect } from "react";

const apiUrl = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3001";

interface RelayResult {
	provider: string;
	status: string;
	attemptedAt: string | null;
}

interface ReportData {
	id: string;
	status: string;
	createdAt: string;
	relayResults: RelayResult[];
	error?: string;
}

const PROVIDER_INFO: Record<string, { label: string; description: string }> = {
	google: { label: "Google Web Risk", description: "Chrome, Firefox, Safari, Android" },
	microsoft: { label: "Microsoft WDSI", description: "Edge, Windows, Outlook" },
	netcraft: { label: "Netcraft", description: "Phishing takedowns" },
	cloudflare: { label: "Cloudflare", description: "Cloudflare-proxied sites" },
	registrar: { label: "Domain Registrar", description: "Domain suspension" },
	hosting: { label: "Hosting Provider", description: "Content takedown" },
};

const STATUS_STEPS = [
	{ key: "pending", label: "Received" },
	{ key: "verifying", label: "Verifying" },
	{ key: "verified", label: "Verified" },
	{ key: "relaying", label: "Relaying" },
	{ key: "completed", label: "Completed" },
] as const;

function getStepIndex(status: string): number {
	if (status === "rejected") return -1;
	return STATUS_STEPS.findIndex((s) => s.key === status);
}

function RelayStatusIcon({ status }: { status: string }) {
	switch (status) {
		case "submitted":
		case "accepted":
			return (
				<div className="flex size-6 items-center justify-center rounded-full bg-green-500/15 text-green-500">
					<svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			);
		case "failed":
			return (
				<div className="flex size-6 items-center justify-center rounded-full bg-red-500/15 text-red-500">
					<svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
			);
		case "skipped":
			return (
				<div className="flex size-6 items-center justify-center rounded-full bg-zinc-500/15 text-zinc-400">
					<svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
					</svg>
				</div>
			);
		default:
			return (
				<div className="flex size-6 items-center justify-center rounded-full bg-zinc-500/10">
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
			<div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
				<div className="text-3xl">🐟</div>
				<p className="mt-3 text-lg font-semibold text-foreground">Report not found</p>
				<p className="mt-2 text-sm text-muted-foreground">
					This report ID doesn't exist or may have expired.
				</p>
			</div>
		);
	}

	if (!report) {
		return (
			<div className="rounded-2xl border border-border bg-card p-8">
				<div className="flex items-center justify-center gap-3 text-muted-foreground">
					<div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					Loading report...
				</div>
			</div>
		);
	}

	const stepIndex = getStepIndex(report.status);
	const isRejected = report.status === "rejected";
	const isCompleted = report.status === "completed";

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Report Status
				</h1>
				<p className="mt-1 font-mono text-sm text-muted-foreground">
					{report.id}
				</p>
			</div>

			{/* Progress pipeline */}
			<div className="rounded-2xl border border-border bg-card p-6">
				{isRejected ? (
					<div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3">
						<div className="flex size-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
							<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<div>
							<p className="text-sm font-medium text-foreground">URL not classified as phishing</p>
							<p className="text-xs text-muted-foreground">
								Our verification didn't confirm this as a phishing site. No reports were sent.
							</p>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2">
						{STATUS_STEPS.map((step, i) => {
							const isActive = i === stepIndex;
							const isDone = i < stepIndex;
							return (
								<div key={step.key} className="flex flex-1 items-center gap-2">
									<div className="flex flex-1 flex-col items-center gap-1.5">
										<div
											className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
												isDone
													? "bg-green-500/15 text-green-500"
													: isActive
														? "bg-primary/15 text-primary ring-2 ring-primary/30"
														: "bg-zinc-500/10 text-zinc-400"
											}`}
										>
											{isDone ? (
												<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											) : (
												i + 1
											)}
										</div>
										<span
											className={`text-[11px] font-medium ${
												isDone || isActive ? "text-foreground" : "text-muted-foreground"
											}`}
										>
											{step.label}
										</span>
									</div>
									{i < STATUS_STEPS.length - 1 && (
										<div
											className={`mb-5 h-0.5 w-full rounded-full transition-colors ${
												isDone ? "bg-green-500/30" : "bg-border"
											}`}
										/>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Relay results */}
			{report.relayResults.length > 0 && (
				<div className="rounded-2xl border border-border bg-card p-6">
					<h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						Relay Providers
					</h2>
					<div className="space-y-3">
						{report.relayResults.map((relay) => {
							const info = PROVIDER_INFO[relay.provider] ?? {
								label: relay.provider,
								description: "",
							};
							return (
								<div
									key={relay.provider}
									className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
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

			{/* Completion summary */}
			{isCompleted && (
				<div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
					<div className="text-3xl">🐟</div>
					<p className="mt-2 text-lg font-semibold text-foreground">All done!</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Your report has been verified and relayed to all applicable providers.
					</p>
				</div>
			)}

			{/* Timestamp */}
			<p className="text-center text-xs text-muted-foreground">
				Reported on {new Date(report.createdAt).toLocaleDateString(undefined, {
					year: "numeric",
					month: "long",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})}
			</p>
		</div>
	);
}
