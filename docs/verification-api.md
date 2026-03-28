# Verification API Specification

LooksPhishy uses an external verification service to classify URLs before relaying reports to security providers. This document defines the API contract so that anyone can implement their own verification backend.

## Overview

The main API calls the verification service during the verification step of the report pipeline. If the service returns a "phishing" verdict with sufficient confidence, the report proceeds to the relay fan-out. Otherwise, it is rejected or held for manual review.

```
Reporter → Main API → Verification Service → Main API → Relay Fan-Out
                         (this spec)
```

The verification service is intentionally decoupled from the main project. It is not open source because exposing the detection logic would allow attackers to craft pages that evade classification.

## Authentication

All requests must include an `x-api-key` header with a shared secret.

```
x-api-key: <shared-secret>
```

The service must return `401 Unauthorized` if the key is missing or invalid.

## Endpoints

### `POST /verify`

Classify a URL as phishing, suspicious, or legitimate.

#### Request

```json
{
  "url": "https://example-phishing-site.com/login"
}
```

| Field | Type   | Required | Description              |
|-------|--------|----------|--------------------------|
| `url` | string | yes      | The URL to classify. Must be a valid URL. |

#### Response

```json
{
  "verdict": "phishing",
  "confidence": 0.92,
  "reasoning": "Page impersonates PayPal login on a non-PayPal domain with a 3-day-old registration.",
  "signals": {
    "page": {
      "finalUrl": "https://example-phishing-site.com/login",
      "redirected": false,
      "statusCode": 200
    }
  }
}
```

| Field        | Type   | Description |
|--------------|--------|-------------|
| `verdict`    | string | One of: `"phishing"`, `"suspicious"`, `"legitimate"` |
| `confidence` | number | Confidence score between `0` and `1` |
| `reasoning`  | string | Human-readable explanation for the verdict |
| `signals`    | object | Optional. Additional metadata collected during analysis |

##### `signals.page` (optional)

| Field        | Type    | Description |
|--------------|---------|-------------|
| `finalUrl`   | string  | The URL after following redirects |
| `redirected` | boolean | Whether the URL redirected |
| `statusCode` | number  | HTTP status code of the final response |

#### Verdicts

| Verdict        | Meaning | Main API behavior |
|----------------|---------|-------------------|
| `"phishing"`   | High confidence this is a phishing or scam page | Proceed to relay if `confidence >= 0.7` |
| `"suspicious"` | Some phishing indicators but not conclusive | Hold for manual review |
| `"legitimate"` | Page appears to be a legitimate site | Reject the report |

The confidence threshold for auto-relay (`0.7`) is configured in the main API, not in the verification service. The verification service should return its honest assessment regardless of thresholds.

#### Error Responses

| Status | Body | When |
|--------|------|------|
| `400`  | `{ "error": "Invalid request", "details": ... }` | Invalid or missing `url` field |
| `401`  | `{ "error": "Unauthorized" }` | Missing or invalid `x-api-key` |
| `500`  | `{ "error": "Internal server error" }` | Unexpected failure |

### `GET /health`

Health check endpoint. Does not require authentication.

#### Response

```json
{
  "status": "ok"
}
```

## Integration

The main API calls the verification service with two environment variables:

| Variable                 | Description |
|--------------------------|-------------|
| `VERIFICATION_API_URL`   | Base URL of the verification service (e.g. `https://verify.looksphishy.org`) |
| `VERIFICATION_API_KEY`   | Shared secret sent as `x-api-key` header |

### Example call from the main API

```typescript
const response = await fetch(`${env.VERIFICATION_API_URL}/verify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": env.VERIFICATION_API_KEY,
  },
  body: JSON.stringify({ url }),
});

const result = await response.json();
// result: { verdict, confidence, reasoning, signals? }
```

## Implementing your own verification service

To replace the default verification backend:

1. Implement the `POST /verify` and `GET /health` endpoints as described above.
2. Deploy it somewhere the main API can reach.
3. Set `VERIFICATION_API_URL` and `VERIFICATION_API_KEY` in the main API's environment.

The service can use any detection method internally — LLM classification, heuristic analysis, third-party scanning APIs, manual review queues, or any combination. The only requirement is that it conforms to this API contract.
