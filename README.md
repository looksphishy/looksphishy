# 🐟 LooksPhishy.org

**Report once. Protect everyone.** 🛡️

LooksPhishy is an open-source fan-out relay for phishing reports. You report a phishing URL once, and we send it to Google Safe Browsing, Cloudflare, and other security providers on your behalf.

No more filling out five different forms. No more hoping someone sees your report.

## 🤔 The problem

You spot a phishing site. Now what? You could report it to Google, then Cloudflare, then your email provider, then... most people give up after the first one. The bad guys know this.

## 💡 How it works

- 📨 **Report a URL** and we relay it to all the major security providers at once
- 📧 **Forward a phishing email** and we'll pull out the URL and report it for you
- 🔍 URLs are **verified before relay** so we don't waste anyone's time with false positives

## 🚀 Getting started

```bash
git clone https://github.com/looksphishy/looksphishy.git
cd looksphishy
pnpm install
pnpm run dev
```

You'll need Node.js 20+, pnpm, PostgreSQL, and Redis.

## 🤝 Contributing

We could use your help. Fork it, branch it, PR it.

## 📄 License

Open source, non-profit. Made to fight phishing.

---

<p align="center">
  🐟 If it looks phishy, report it.
</p>
