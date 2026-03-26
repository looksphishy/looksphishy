import { useState, useRef } from "react"
import { Button } from "@looksphishy/ui"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"

export function ReportForm() {
  const [url, setUrl] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || !token) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
        <div className="text-4xl">🐟</div>
        <p className="mt-3 text-lg font-semibold text-white">
          Got it. We'll take it from here.
        </p>
        <p className="mt-2 text-sm text-teal-200/60">
          Your report is being verified and relayed to security providers.
        </p>
        <button
          type="button"
          className="mt-6 text-sm font-medium text-teal-300 underline underline-offset-4 hover:no-underline"
          onClick={() => {
            setUrl("")
            setToken(null)
            setSubmitted(false)
            turnstileRef.current?.reset()
          }}
        >
          Report another URL
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">Report a phishing URL</h3>
        <p className="mt-1 text-sm text-teal-200/50">
          We'll verify it and relay to all major providers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="url" className="mb-1.5 block text-xs font-medium text-teal-200/70">
            Suspicious URL
          </label>
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example-phishing-site.com"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/25"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-teal-200/70">
            Your email <span className="text-teal-200/30">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/25"
          />
        </div>

        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setToken}
          onExpire={() => setToken(null)}
          options={{ theme: "dark", size: "flexible" }}
        />

        <Button
          type="submit"
          disabled={!token}
          className="!h-11 !w-full !rounded-lg !bg-teal-400 !text-base !font-semibold !text-gray-950 hover:!bg-teal-300 disabled:!opacity-50"
        >
          Report this URL
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-teal-200/30">
        No account needed. We don't track you.
      </p>
    </div>
  )
}
