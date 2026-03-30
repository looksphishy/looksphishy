# LooksPhishy.org

## Project Overview
An open-source, non-profit "fan-out" relay for phishing reports. Report a phishing URL once, and it gets relayed to Google, Microsoft, Cloudflare, domain registrars, and hosting providers simultaneously.

- **Architecture**: Monorepo with Astro (Frontend), NestJS (Backend API), and a separate verification microservice.
- **Tech Stack**: TypeScript, Astro (React Islands), NestJS, tRPC, BullMQ (Redis), PostgreSQL (Drizzle ORM).
- **Deployment**: Self-hosted; Cloudflare Email Workers for inbound email-to-webhook processing.

## Core Commands
- **Dev**: `pnpm run dev` (starts Astro + NestJS)
- **Build**: `pnpm run build` (rebuild `libs/shared` first if you change shared types)
- **Test**: `pnpm run test`
- **Shared lib**: `pnpm --filter @looksphishy/shared run build` (must rebuild after changing constants/types — the API imports from `dist/`)

## Architecture Conventions
- **Frontend**: Use Astro for static/SEO pages. Use React components ONLY for interactive islands (e.g., search bars, report forms) using `client:load` or `client:visible`.
- **API**: End-to-end type safety via tRPC. Avoid standard REST controllers unless required for external webhooks (like email providers).
- **Async Logic**: All "Fan-Out" reporting logic MUST live in BullMQ workers to avoid blocking the API.
- **Verification**: The `VerificationService` calls an external verification microservice (`VERIFICATION_API_URL`) that uses Google Safe Browsing + LLM-based page analysis to classify URLs as phishing/suspicious/legitimate. Only `phishing` verdicts trigger the relay fan-out.

## Relay Providers
Reports are fanned out to these providers via BullMQ jobs. Each provider has a `shouldRelay()` gate and a `submitReport()` implementation.

| Provider | Target | Gate | Status |
|---|---|---|---|
| `google` | Google Web Risk API | always | implemented |
| `microsoft` | Microsoft WDSI | always | implemented |
| `cloudflare` | Cloudflare Abuse Reports API | `isCloudflare` | implemented |
| `registrar` | Registrar abuse email (RDAP) | `registrarAbuseEmail` exists | implemented (AWS SES) |
| `hosting` | Hosting provider abuse email (IP RDAP) | `hostingAbuseEmail` exists | implemented (AWS SES) |
| `apwg` | APWG eCrime Exchange | always | stub (requires $5K membership) |

## Email Architecture
- **Plunk** (`EmailModule`): User-facing transactional emails (confirmations, status updates).
- **AWS SES** (`AbuseMailModule`): Abuse report emails to registrars and hosting providers. Uses a dedicated subdomain (e.g., `reports.looksphishy.org`) to isolate sender reputation.
- **Inbound**: Cloudflare Email Workers parse incoming emails and POST to `/api/webhooks/inbound-email`.

## Code Style & Standards
- **Imports**: Use relative paths (e.g., `../../config/env.js`). No path aliases — they don't work at runtime since NestJS builds to `dist/` without path rewriting.
- **Types**: Strict TypeScript. Use Zod schemas for validation that can be shared between tRPC and Drizzle.
- **Naming**: Use descriptive, "human-first" names (e.g., `isRecentlyReported` instead of `checkUrlStatus`).
- **Safety**: NEVER log raw phishing URLs to standard output without masking/hashing. Use `maskUrl()` from `@/common/url-safety.js`.
- **Shared types**: Provider enums and relay types live in `libs/shared/src/constants.ts`. The DB schema enum in `schema.ts` must stay in sync manually.

## Important Gotchas
- **Shared lib builds**: `@looksphishy/shared` exports from `dist/`. If you change `constants.ts` or shared schemas, you must run `pnpm --filter @looksphishy/shared run build` before the API will see the new types.
- **Environment variables**: Validated at startup via Zod in `apps/api/src/config/env.ts`. All new env vars must be added there and in `.env.example`.
- **Email**: Inbound emails from Cloudflare arrive as JSON via `/api/webhooks/inbound-email`.
- **SES**: Outbound abuse mail uses `AbuseMailModule`. Verify SES identities in the AWS Console before testing new sender addresses.
- **Plunk CJS interop**: Import as `import { Plunk } from "@plunk/node/dist/lib/Plunk.js"` (not the default export) due to ESM/CJS interop with `module: NodeNext`.
