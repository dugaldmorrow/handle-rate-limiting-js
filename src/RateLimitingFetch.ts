import { FetchInterface, NodeFetch } from './FetchInterface';
import {
  RateLimitingFetchStatsRecorder,
  NoopRateLimitingFetchStatsRecorder
} from './RateLimitingFetchStats';
import { RateLimitingHandlingOptions } from './RateLimitingHandlingOptions';

const minJitterMultiplier = 1;

const tooManyRequestsStatusCode = 429;
const internalServerErrorStatusCode = 500;
const serviceUnavailableStatusCode = 503;

/**
 * This class provides a fetch implementation that handles rate limiting.
 */
export class RateLimitingFetch {

  fetchImplementation: FetchInterface = new NodeFetch();
  options: RateLimitingHandlingOptions;
  debugEnabled: boolean = false;
  statsRecorder: RateLimitingFetchStatsRecorder = new NoopRateLimitingFetchStatsRecorder();

  constructor(options: RateLimitingHandlingOptions) {
    this.options = options;
    this._validateOptions(options);
  }

  /**
   * Call this method to perform the actual fetch. The method has the same signature and semantics of the 
   * standard fetch method as documented in https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API. 
   */
  public fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return await this._fetch(this.options.maxRetries, 0, url, init);
  }

  /**
   * By default, the in-built `fetch` implementation is used, but this method allows an alternate fetch 
   * mechanism to be injected. For example, tis can be used for testing as follows:
     ```
     if (process.env.MOCK_RATE_LIMITING = 'true') {
       const fetchImplementation = new RandomRateLimitingInjectionFetch();
       this.rateLimitingFetch.setFetchImplementation(fetchImplementation);
     }
     ```
   * @param fetchImplementation the fetch implementation to use.
   */
  public setFetchImplementation = (fetchImplementation: FetchInterface): void => {
    this.fetchImplementation = fetchImplementation;
  }

  /**
   * This method allows an implementation of `RateLimitingFetchStatsRecorder` to be injected.
   * @param statsRecorder the implementation of `RateLimitingFetchStatsRecorder` to be injected.
   */
  public setRateLimitingFetchStatsRecorder = (statsRecorder: RateLimitingFetchStatsRecorder): void => {
    this.statsRecorder = statsRecorder;
  }

  /**
   * This method controls whether to log debug to the console.
   * @param debugEnabled if `true`, debug will be logged to the console, otherwise it will not be logged.
   */
  public setDebugEnabled = (debugEnabled: boolean): void => {
    this.debugEnabled = debugEnabled;
  }

  private _fetch = async (remainintRetries: number, lastRetryDelayMillis: number, url: RequestInfo, init?: RequestInit): Promise<Response> => {
    this.statsRecorder.logFetchAttempt();
    let retryAfterHeader: string | undefined = undefined;
    const response = await this.fetchImplementation.fetch(url, init);
    const statusCode = response.status;
    const responseNeedsRetry =
      statusCode === tooManyRequestsStatusCode ||
      statusCode === internalServerErrorStatusCode ||
      statusCode === serviceUnavailableStatusCode;
    if (responseNeedsRetry) {
      if (this.debugEnabled) {
        console.log(`Fetch of ${url} was not successful (${statusCode} status).`);
      }
      let unjitteredRetryDelayMillis = -1;
      retryAfterHeader = response.headers.get('Retry-After');
      if (retryAfterHeader) {
        try {
          const retryAfterSeconds = parseInt(retryAfterHeader.trim());
          unjitteredRetryDelayMillis = 1000 * retryAfterSeconds;
        } catch (error) {
          console.warn(`Unable to parse Retry-After header: ${retryAfterHeader}`);
        }
      } else {
        if (lastRetryDelayMillis > 0) {
          unjitteredRetryDelayMillis = Math.min(this.options.backoffMultiplier * lastRetryDelayMillis, this.options.maxRetryDelayMillis);
        } else {
          unjitteredRetryDelayMillis = this.options.initialRetryDelayMillis;
        }
      }
      if (remainintRetries > 0 && unjitteredRetryDelayMillis > 0) {
        if (this.debugEnabled) {
          console.log(`Unjittered rate limit retry delay  = ${unjitteredRetryDelayMillis}ms.`);
        }
        const jitterMultiplier = this._randomInRange(minJitterMultiplier, this.options.maxJitterMultiplier);
        const retryDelayMillis = unjitteredRetryDelayMillis * jitterMultiplier;
        if (this.debugEnabled) {
          console.log(`Delaying ${retryDelayMillis}ms to account for rate limited response...`);
        }
        this._delay(retryDelayMillis);
        this.statsRecorder.logRetry(retryDelayMillis);
        if (this.debugEnabled) {
          console.log(`Retrying fetch of ${url}`);
        }
        return this._fetch(remainintRetries - 1, retryDelayMillis, url, init);
      } else {
        return response;
      }
    } else {
      if (this.debugEnabled) {
        console.log(`Fetch of ${url} was successful.`);
      }
      return response;
    }
  }

  private _delay = async (millis: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, millis);
    });
  };

  private _validateOptions = (options: RateLimitingHandlingOptions) => {
    if (options.maxRetries < 0) {
      throw new Error(`Invalid RateLimitFetch options: maxRetries is ${options.maxRetries}, but it must be >= 0`);
    }
    if (options.maxRetryDelayMillis <= 0) {
      throw new Error(`Invalid RateLimitFetch options: maxRetryDelayMillis is ${options.maxRetryDelayMillis}, but it must be > 0`);
    }
    if (options.maxJitterMultiplier < minJitterMultiplier) {
      throw new Error(`Invalid RateLimitFetch options: maxJitterMultiplier is ${options.maxJitterMultiplier}, but it must be > than minJitterMultiplier which is ${minJitterMultiplier}.`);
    }
  }

  private _randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  }

}
export { FetchInterface };

