
export interface RateLimitingHandlingOptions {
  /**
   * The maximum number of fetch attempts
   */
  maxRetries: number;
  /**
   * The maximum delay in milliseconds before any fetch retry.
   */
  maxRetryDelayMillis: number;
  /**
   * A multiplier value to apply against the previous retry delay.
   */
  backoffMultiplier: number;
  /**
   * The initial retry delay in milliseconds.
   */
  initialRetryDelayMillis: number;
  /**
   * The maximum multiplier to jitter retry delays with. This must be greater than 1 since
   * the minimum jitter multiplier is 1 due to not wanting to jitter below the delay
   * instructed in any response headers.
   */
  maxJitterMultiplier: number;
}

export const nonUiContextRateLimitingHandlingOptionsDefaults: RateLimitingHandlingOptions = {
  maxRetries: 2,
  maxRetryDelayMillis: 60000,
  backoffMultiplier: 2,
  initialRetryDelayMillis: 5000,
  maxJitterMultiplier: 1.3,
}
