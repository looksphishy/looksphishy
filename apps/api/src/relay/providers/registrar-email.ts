import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";

interface AbuseEmail {
	subject: string;
	text: string;
	html: string;
}

export function buildAbuseEmail(url: string, intel: DomainIntel): AbuseEmail {
	const domain = intel.domain;

	const subject = `[Phishing Report] Malicious domain: ${domain}`;

	const text = `Dear Abuse Team,

We are writing to report a phishing website hosted on a domain registered through your organization.

REPORTED URL
${url}

DOMAIN: ${domain}
REGISTRAR: ${intel.registrar ?? "Unknown"}

DETAILS
The above URL has been identified as a phishing site designed to deceive users into disclosing sensitive information such as login credentials, financial data, or personal details.

This report was generated after automated verification confirmed the malicious nature of this URL.

REQUEST
We respectfully request that you investigate this domain and take appropriate action, which may include suspending the domain or notifying the registrant, in accordance with your abuse policies and ICANN obligations.

ABOUT US
LooksPhishy.org is an open-source, non-profit phishing report relay service. We aggregate phishing reports from the public and automatically distribute them to the relevant security providers and registrars.

Learn more: https://looksphishy.org
Contact: abuse@looksphishy.org

Thank you for your prompt attention to this matter.`;

	const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #b91c1c; margin-bottom: 4px;">Phishing Report</h2>
  <p style="color: #666; margin-top: 0;">Malicious domain: <strong>${escapeHtml(domain)}</strong></p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">

  <p>Dear Abuse Team,</p>
  <p>We are writing to report a phishing website hosted on a domain registered through your organization.</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; font-weight: 600;">Reported URL</td>
      <td style="padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; word-break: break-all;">
        <code>${escapeHtml(url)}</code>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">Domain</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${escapeHtml(domain)}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">Registrar</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${escapeHtml(intel.registrar ?? "Unknown")}</td>
    </tr>
  </table>

  <h3 style="margin-bottom: 8px;">Details</h3>
  <p>The above URL has been identified as a phishing site designed to deceive users into disclosing sensitive information such as login credentials, financial data, or personal details.</p>
  <p>This report was generated after automated verification confirmed the malicious nature of this URL.</p>

  <h3 style="margin-bottom: 8px;">Request</h3>
  <p>We respectfully request that you investigate this domain and take appropriate action, which may include suspending the domain or notifying the registrant, in accordance with your abuse policies and ICANN obligations.</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">

  <p style="font-size: 13px; color: #666;">
    This report was sent by <a href="https://looksphishy.org" style="color: #2563eb;">LooksPhishy.org</a>,
    an open-source, non-profit phishing report relay service.<br>
    Contact: <a href="mailto:abuse@looksphishy.org" style="color: #2563eb;">abuse@looksphishy.org</a>
  </p>
</body>
</html>`;

	return { subject, text, html };
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
