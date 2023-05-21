
/**
 * This interface provides a means for recording statistics.
 */
export interface RateLimitingFetchStats {

  fetchAttemptCount: number
  fetchRetryCount: number
  totalFetchRetryDelay: number
}

/**
 * This interface provides a means for recording statistics.
 */
export interface RateLimitingFetchStatsRecorder {

  logFetchAttempt: () => void
  logRetry: (delayMillis: number) => void
  getRateLimitingFetchStats: () => RateLimitingFetchStats
  reportToConsole: () => void

}

export class NoopRateLimitingFetchStatsRecorder implements RateLimitingFetchStatsRecorder  {

  public logFetchAttempt = (): void => {
  }

  public logRetry = (delayMillis: number): void => {
  }

  public getRateLimitingFetchStats = (): RateLimitingFetchStats => {
    const stats: RateLimitingFetchStats = {
      fetchAttemptCount: 0,
      fetchRetryCount: 0,
      totalFetchRetryDelay: 0
    }
    return stats;
  }

  public reportToConsole = (): void => {
  }

}

export class SimpleRateLimitingFetchStatsRecorder implements RateLimitingFetchStatsRecorder {

  stats: RateLimitingFetchStats = {
    fetchAttemptCount: 0,
    fetchRetryCount: 0,
    totalFetchRetryDelay: 0
  }

  public logFetchAttempt = (): void => {
    this.stats.fetchAttemptCount++;
  }

  public logRetry = (delayMillis: number): void => {
    this.stats.fetchRetryCount++;
    this.stats.totalFetchRetryDelay += delayMillis;
  }

  public getRateLimitingFetchStats = (): RateLimitingFetchStats => {
    return this.stats;
  }

  public reportToConsole = (): void => {
    console.log(` * fetch attempt count = ${this.stats.fetchAttemptCount}`);
    console.log(` * fetch retry count = ${this.stats.fetchRetryCount}`);
    console.log(` * total fetch retry delay = ${this.stats.totalFetchRetryDelay / 1000}s`);
    if (this.stats.fetchRetryCount) {
      console.log(` * average fetch retry delay = ${this.stats.totalFetchRetryDelay / (1000 * this.stats.fetchRetryCount)}s`);
    }
  }

}
