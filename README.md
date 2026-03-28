# 🐟 LooksPhishy.org

**Report once. Protect everyone.**

LooksPhishy is an open-source fan-out relay for phishing reports. You report a phishing URL once, and we send it to Google Safe Browsing, Cloudflare, and other security providers on your behalf.

No more filling out five different forms. No more hoping someone sees your report.

## The problem

You spot a phishing site. Now what? You could report it to Google, then Cloudflare, then your email provider, then... most people give up after the first one. The bad guys know this.

## How it works

- **Report a URL** and we relay it to all the major security providers at once
- **Forward a phishing email** and we'll pull out the URL and report it for you
- URLs are **verified before relay** so we don't waste anyone's time with false positives

## Getting started

```bash
git clone https://github.com/looksphishy/looksphishy.git
cd looksphishy
pnpm install
pnpm run dev
```

You'll need Node.js 20+, pnpm, PostgreSQL, and Redis.

## Verification

Before relaying a report, every URL is checked by a verification service to confirm it actually looks like phishing. This protects our API credentials with downstream providers — too many false positives and we'd get banned.

The verification service is **closed source by design**. If attackers could read the detection logic, they'd craft pages to bypass it. The relay infrastructure (this repo) is fully open, but the thing that decides "is this phishing?" is kept private.

Want to run your own? The API contract is documented in [`docs/verification-api.md`](docs/verification-api.md). Implement those two endpoints and point LooksPhishy at your service.

## Contributing

We could use your help. Fork it, branch it, PR it.

## License

Open source, non-profit. Made to fight phishing.

---

<p align="center">
  🐟 If it looks phishy, report it.
</p>
