import { Injectable, Logger } from "@nestjs/common"

export interface CloudflareEmailPayload {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  headers: Record<string, string>
}

@Injectable()
export class EmailParserService {
  private readonly logger = new Logger(EmailParserService.name)

  extractUrls(payload: CloudflareEmailPayload): string[] {
    const urls = new Set<string>()

    if (payload.text) {
      for (const url of this.extractUrlsFromText(payload.text)) {
        urls.add(url)
      }
    }

    if (payload.html) {
      for (const url of this.extractUrlsFromHtml(payload.html)) {
        urls.add(url)
      }
    }

    this.logger.log(`Extracted ${urls.size} unique URLs from email`)
    return [...urls]
  }

  private extractUrlsFromText(text: string): string[] {
    const urlPattern = /https?:\/\/[^\s<>"')\]]+/gi
    return text.match(urlPattern) ?? []
  }

  private extractUrlsFromHtml(html: string): string[] {
    const hrefPattern = /href=["'](https?:\/\/[^"']+)["']/gi
    const urls: string[] = []
    let match: RegExpExecArray | null

    while ((match = hrefPattern.exec(html)) !== null) {
      urls.push(match[1])
    }

    return urls
  }
}
