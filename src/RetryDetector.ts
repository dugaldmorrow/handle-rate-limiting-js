import { RateLimitingHandlingOptions } from './RateLimitingHandlingOptions';
import { RetryInfo } from './RetryInfo';
import {
  internalServerErrorStatusCode,
  minJitterMultiplier,
  serviceUnavailableStatusCode,
  tooManyRequestsStatusCode
} from './RateLimitingConstants';

/**
 * This interface abstracts the detection of whether a retry is necessary.
 */
export interface RetryDetector {

  /**
   * This method is responsible for the detection of whether a retry is necessary.
   * @param remainingRetries This method is responsible for determining whether it is necessary to 
   * retry a request.
   * @param lastRetryDelayMillis 
   * @param options 
   * @param response 
   * @returns an instance of RetryInfo if it is necessary to retry the request or undefined if no
   * retry is necessary.
   */
  computeRetryInfo: (
    remainingRetries: number,
    lastRetryDelayMillis: number,
    options: RateLimitingHandlingOptions,
    response: Response
  ) => undefined | RetryInfo;

}

export class DefaultRetryDetector implements RetryDetector {

  computeRetryInfo = (
      remainingRetries: number,
      lastRetryDelayMillis: number,
      options: RateLimitingHandlingOptions,
      response: Response): undefined | RetryInfo => {
    const statusCode = response.status;
    const responseNeedsRetry =
      statusCode === tooManyRequestsStatusCode ||
      statusCode === internalServerErrorStatusCode ||
      statusCode === serviceUnavailableStatusCode;
    if (responseNeedsRetry) {
      let unjitteredRetryDelayMillis = -1;
      let retryAfterHeader: string | undefined = response.headers.get('Retry-After');
      if (retryAfterHeader) {
        try {
          const retryAfterSeconds = parseInt(retryAfterHeader.trim());
          unjitteredRetryDelayMillis = 1000 * retryAfterSeconds;
        } catch (error) {
          console.warn(`Unable to parse Retry-After header: ${retryAfterHeader}`);
        }
      } else {
        if (lastRetryDelayMillis > 0) {
          unjitteredRetryDelayMillis = Math.min(options.backoffMultiplier * lastRetryDelayMillis, options.maxRetryDelayMillis);
        } else {
          unjitteredRetryDelayMillis = options.initialRetryDelayMillis;
        }
      }
      if (remainingRetries > 0 && unjitteredRetryDelayMillis > 0) {
        const jitterMultiplier = this.randomInRange(minJitterMultiplier, options.maxJitterMultiplier);
        const retryDelayMillis = unjitteredRetryDelayMillis * jitterMultiplier;
        const retryInfo: RetryInfo = {
          remainingRetries: remainingRetries - 1,
          retryDelayMillis: retryDelayMillis
        }
        return retryInfo;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  }

}
