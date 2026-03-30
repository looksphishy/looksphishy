export const RELAY_PROVIDERS = [
	"google",
	"netcraft",
	"cloudflare",
	"registrar",
	"hosting",
] as const;
export type RelayProvider = (typeof RELAY_PROVIDERS)[number];

export const REPORT_STATUSES = [
	"pending",
	"verifying",
	"verified",
	"rejected",
	"relaying",
	"completed",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const RELAY_STATUSES = [
	"pending",
	"submitted",
	"accepted",
	"failed",
	"skipped",
] as const;
export type RelayStatus = (typeof RELAY_STATUSES)[number];

export const REPORT_SOURCES = ["web", "email", "api"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];
