import { FetchInterface, NodeFetch } from './FetchInterface';
import { minJitterMultiplier } from './RateLimitingConstants';
import {
  RateLimitingFetchStatsRecorder,
  NoopRateLimitingFetchStatsRecorder
} from './RateLimitingFetchStats';
import { RateLimitingHandlingOptions } from './RateLimitingHandlingOptions';
import { DefaultRetryDetector, RetryDetector } from './RetryDetector';

/**
 * This class provides a fetch implementation that handles rate limiting.
 */
export class RateLimitingFetch {

  fetchImplementation: FetchInterface = new NodeFetch();
  options: RateLimitingHandlingOptions;
  debugEnabled: boolean = false;
  statsRecorder: RateLimitingFetchStatsRecorder = new NoopRateLimitingFetchStatsRecorder();
  retryDetector: RetryDetector = new DefaultRetryDetector();

  constructor(options: RateLimitingHandlingOptions) {
    this.options = options;
    this._validateOptions(options);
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
   * This method allows an implementation of `RetryDetector` to be injected.
   * @param retryDetector the implementation of `RetryDetector` to be injected.
   */
  public setRetryDetector = (retryDetector: RetryDetector): void => {
    this.retryDetector = retryDetector;
  }

  /**
   * This method controls whether to log debug to the console.
   * @param debugEnabled if `true`, debug will be logged to the console, otherwise it will not be logged.
   */
  public setDebugEnabled = (debugEnabled: boolean): void => {
    this.debugEnabled = debugEnabled;
  }

  /**
   * Call this method to perform the actual fetch. The method has the same signature and semantics of the 
   * standard fetch method as documented in https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API. 
   */
  public fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return await this._fetch(this.options.maxRetries, 0, url, init);
  }

  private _fetch = async (remainingRetries: number, lastRetryDelayMillis: number, url: RequestInfo, init?: RequestInit): Promise<Response> => {
    this.statsRecorder.logFetchAttempt();
    const response = await this.fetchImplementation.fetch(url, init);
    const retryInfo = this.retryDetector.computeRetryInfo(
      remainingRetries, lastRetryDelayMillis, this.options, response);
    if (retryInfo) {
      this._delay(retryInfo.retryDelayMillis);
      this.statsRecorder.logRetry(retryInfo.retryDelayMillis);
      return await this._fetch(retryInfo.remainingRetries, retryInfo.retryDelayMillis, url, init);
    } else {
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

}
export { FetchInterface };

