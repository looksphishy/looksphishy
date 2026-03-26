export interface RelaySubmissionResult {
  success: boolean
  response?: unknown
}

export abstract class BaseRelayProvider {
  abstract readonly name: string
  abstract submitReport(url: string): Promise<RelaySubmissionResult>
}
