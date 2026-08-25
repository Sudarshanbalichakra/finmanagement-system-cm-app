/**
 * User-Friendly Error Handler Utility
 * Converts technical exceptions, Axios errors, and backend status codes
 * into clear, actionable, non-technical messages for end-users.
 */

const TECHNICAL_PATTERNS = [
  /axioserror/i,
  /request failed with status/i,
  /\[object object\]/i,
  /econnrefused/i,
  /err_network/i,
  /jwt /i,
  /mongo/i,
  /sql/i,
  /internal server error/i,
  /typeerror/i,
  /syntaxerror/i,
  /cannot read propert/i,
  /at eval/i,
  /stack trace/i,
  /exception/i,
  /undefined/i,
  /null/i,
  /cast to objectid/i,
  /validation failed/i,
];

function isTechnicalError(msg: string): boolean {
  if (!msg || typeof msg !== "string") return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

function sanitizeMessage(msg: string): string {
  let cleaned = msg.trim();
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  // Ensure ending punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
}

export function getFriendlyErrorMessage(
  error: any,
  fallbackMessage = "Something went wrong. Please try again."
): string {
  if (!error) return fallbackMessage;

  // If error is already a string
  if (typeof error === "string") {
    return isTechnicalError(error) ? fallbackMessage : sanitizeMessage(error);
  }

  // Network / Connection Timeout / Offline scenarios
  if (
    error.code === "ECONNABORTED" ||
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.message?.includes("Network Error") ||
    error.message?.includes("timeout") ||
    (!error.response && error.request)
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // If HTTP Response is received from the server
  if (error.response) {
    const status = error.response.status;
    const resData = error.response.data;

    let rawMsg: string | undefined;
    if (typeof resData === "string") {
      rawMsg = resData;
    } else if (resData?.message) {
      rawMsg = Array.isArray(resData.message)
        ? resData.message.join(". ")
        : String(resData.message);
    } else if (resData?.error) {
      rawMsg =
        typeof resData.error === "string"
          ? resData.error
          : resData.error?.message;
    }

    // 401 Unauthorized / Bad Credentials
    if (status === 401) {
      const lower = (rawMsg || "").toLowerCase();
      if (
        lower.includes("invalid") ||
        lower.includes("credential") ||
        lower.includes("password") ||
        lower.includes("cm") ||
        lower.includes("id")
      ) {
        return "Invalid Collection Manager ID or password.";
      }
      return "Your session has expired. Please sign in again.";
    }

    // 403 Forbidden / Inactive Account
    if (status === 403) {
      return "Your account is inactive or access is restricted. Please contact your administrator.";
    }

    // 404 Not Found
    if (status === 404) {
      return "The requested record or service could not be found.";
    }

    // 409 Conflict
    if (status === 409) {
      if (rawMsg && !isTechnicalError(rawMsg)) {
        return sanitizeMessage(rawMsg);
      }
      return "A collection entry has already been recorded for this account today.";
    }

    // 400 Bad Request / Validation Failure
    if (status === 400) {
      if (rawMsg && !isTechnicalError(rawMsg)) {
        return sanitizeMessage(rawMsg);
      }
      return "Invalid collection details. Please verify the amount and try again.";
    }

    // 500+ Server Errors
    if (status >= 500) {
      return "Server is temporarily unavailable. Please try again in a few moments.";
    }

    // User-friendly messages with other HTTP codes
    if (rawMsg && !isTechnicalError(rawMsg)) {
      return sanitizeMessage(rawMsg);
    }
  }

  // Native error message fallback if clean
  if (error.message && !isTechnicalError(error.message)) {
    return sanitizeMessage(error.message);
  }

  return fallbackMessage;
}
