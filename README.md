# 🐟 LooksPhishy.org

> **Report once. Protect everyone.** 🛡️

LooksPhishy is an open-source, non-profit **fan-out relay for phishing reports**. It takes the pain out of reporting phishing URLs by automating the distribution to major security providers — so one report reaches Google Safe Browsing, Cloudflare, and more, all at once.

---

## ✨ Why LooksPhishy?

Reporting a phishing site today means visiting multiple portals, filling out forms, and hoping someone acts on it. LooksPhishy fixes that:

- 📨 **One report, many destinations** — submit a URL and we fan it out to all the right places
- 🔍 **Automatic verification** — URLs are vetted before relay to avoid false positives
- ⚡ **Async processing** — reports are queued and processed in the background, fast and reliable
- 📧 **Email-friendly** — forward a phishing email and we'll extract & report the URL for you

---

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Astro App  │────▶│  NestJS API │────▶│   BullMQ    │
│  (Frontend) │ tRPC│  (Backend)  │     │  (Workers)  │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                    ┌──────┴──────┐     ┌──────┴──────┐
                    │ PostgreSQL  │     │    Redis     │
                    │  (Drizzle)  │     │   (Queue)   │
                    └─────────────┘     └─────────────┘
```

| Layer        | Tech                              |
| ------------ | --------------------------------- |
| 🖥️ Frontend  | Astro + React Islands             |
| 🔌 API       | NestJS + tRPC (end-to-end types)  |
| 📬 Queue     | BullMQ (Redis)                    |
| 🗄️ Database  | PostgreSQL via Drizzle ORM        |
| 📧 Email In  | Cloudflare Email Workers → Webhook|
| 📤 Email Out | AWS SES                           |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10
- **PostgreSQL** & **Redis** running locally (or via Docker)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/looksphishy/looksphishy.git
cd looksphishy

# Install dependencies
pnpm install

# Start development servers
pnpm run dev
```

### 📦 Monorepo Structure

```
looksphishy/
├── apps/          # 🖥️ Astro frontend & 🔌 NestJS API
├── libs/          # 📚 Shared packages (types, utils, config)
├── turbo.json     # ⚙️ Turborepo pipeline config
└── package.json   # 📋 Root workspace
```

---

## 🧑‍💻 Development

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm run dev`   | 🔥 Start all apps in dev mode  |
| `pnpm run build` | 📦 Build all apps & libs       |
| `pnpm run test`  | 🧪 Run tests across workspace  |

---

## 🤝 Contributing

We'd love your help making the internet a little safer! 💪

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes
4. Open a Pull Request

Please keep in mind that this project deals with phishing URLs — **never log or display raw malicious URLs** in plain text. Always mask or hash them. 🔒

---

## 📄 License

Open source — made with ❤️ to fight phishing.

---

<p align="center">
  <strong>🐟 If it looks phishy, report it.</strong>
</p>
