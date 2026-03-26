# LooksPhishy.org

## Project Overview
An open-source, non-profit "fan-out" relay for phishing reports. It simplifies the reporting process for humans and automates the distribution of threat intelligence to major security providers (Google, Cloudflare, etc.).

- **Architecture**: Monorepo-style with Astro (Frontend) and NestJS (Backend API).
- **Tech Stack**: TypeScript, Astro (React Islands), NestJS, tRPC, BullMQ (Redis), PostgreSQL (Drizzle ORM).
- **Deployment**: Self-hosted on Coolify; Cloudflare Email Workers for inbound email-to-webhook processing.

## Core Commands
- **Dev**: `pnpm run dev` (starts Astro + NestJS)
- **Build**: `pnpm run build`
- **Test**: `pnpm run test`

## Architecture Conventions
- **Frontend**: Use Astro for static/SEO pages. Use React components ONLY for interactive islands (e.g., search bars, report forms) using `client:load` or `client:visible`.
- **API**: End-to-end type safety via tRPC. Avoid standard REST controllers unless required for external webhooks (like email providers).
- **Async Logic**: All "Fan-Out" reporting logic MUST live in BullMQ workers to avoid blocking the API.
- **Verification**: Use the `VerificationService` to vet URLs (via urlscan.io/SLM) before triggering the relay.

## Code Style & Standards
- **Imports**: Use absolute paths with `@/` alias.
- **Types**: Strict TypeScript. Use Zod schemas for validation that can be shared between tRPC and Drizzle.
- **Naming**: Use descriptive, "human-first" names (e.g., `isRecentlyReported` instead of `checkUrlStatus`).
- **Safety**: NEVER log raw phishing URLs to standard output without masking/hashing to prevent accidental clicks in logs.

## Important Gotchas
- **Coolify**: Environment variables are managed in the Coolify UI. Check `process.env.REDIS_URL` for BullMQ connection.
- **Email**: Inbound emails from Cloudflare arrive as JSON via `/api/webhooks/inbound-email`.
- **SES**: Outbound mail uses the `AwsSesModule`. Verify identities in the AWS Console before testing new sender addresses.
