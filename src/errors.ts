export type PaperSummaryErrorCode =
  | "missing_api_key"
  | "api_request_failed"
  | "empty_response"
  | "invalid_response"
  | "note_exists"
  | "invalid_input";

export class PaperSummaryError extends Error {
  code: PaperSummaryErrorCode;
  details?: unknown;

  constructor(code: PaperSummaryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "PaperSummaryError";
    this.code = code;
    this.details = details;
  }
}
