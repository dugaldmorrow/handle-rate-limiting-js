import { FetchInterface } from './FetchInterface';

/**
 * This interface encapsulates mock rate limiting response information.
 */
export interface MockFetchInfo {

  responseStatusCode: number
  responseStatusText: string
  addResponseHeaders: (headers: Map<string, string>) => void

}

/**
 * This interface abstracts the means by which mock rate limiting info is obtained. It is
 * designed to allow alternate implementations to be injected.
 */
export interface MockFetchController {

  getMockFetchInfo: (timeOfLastRateLimit: number) => undefined | MockFetchInfo;

}

/**
 * This class provides a simple implementation of `MockFetchController` which is based on randomly
 * returning rate limiting and internal server error responses.
 */
export class SimpleMockFetchController implements MockFetchController {

  nextMockFetchInfo: undefined | MockFetchInfo = undefined;

  setNextMockFetchInfo = (nextMockFetchInfo: undefined | MockFetchInfo): void => {
    this.nextMockFetchInfo = nextMockFetchInfo;
  }

  getMockFetchInfo = (timeOfLastRateLimit: number): undefined | MockFetchInfo => {
    return this.nextMockFetchInfo;
  }

}

/**
 * This class provides a simple implementation of `MockFetchController` which is based on randomly
 * returning 429 Too Many Requests, 500 Internal Server Error and 503 Service Unavailable. Further 
 * randomness is provided by mixing the existence of Retry-After headers.
 */
export class RandomMockFetchController implements MockFetchController {

  getMockFetchInfo = (timeOfLastRateLimit: number): undefined | MockFetchInfo => {
    const now = new Date().getTime();
    const millisSinceLastRateLimit = now - timeOfLastRateLimit;
    let threshold = 1;
    if (millisSinceLastRateLimit < 100) {
      threshold = 0.7;
    } else if (millisSinceLastRateLimit < 1000) {
      threshold = 0.75;
    } else if (millisSinceLastRateLimit < 5000) {
      threshold = 0.8;
    } else if (millisSinceLastRateLimit < 10000) {
      threshold = 0.85;
    } else {
      threshold = 0.9;
    }
    console.log(`Rate limit randomness threshold = ${threshold} (duration since last rate limit = ${millisSinceLastRateLimit}).`);
    if (Math.random() <= threshold) {
      return undefined;      
    } else {
      const randomValue = Math.random();
      if (randomValue < 0.5) {
        const mockFetchInfo: MockFetchInfo = {
          responseStatusCode: 429,
          responseStatusText: 'Too Many Requests',
          addResponseHeaders: Math.random() < 0.5 ? this.addNoResponseHeaders : this.addRetryAfterResponseHeader
        }
        return mockFetchInfo;
      } else if (randomValue < 0.75) {
        const mockFetchInfo: MockFetchInfo = {
          responseStatusCode: 500,
          responseStatusText: 'Internal Server Error',
          addResponseHeaders: this.addNoResponseHeaders
        }
        return mockFetchInfo;
      } else {
        const mockFetchInfo: MockFetchInfo = {
          responseStatusCode: 503,
          responseStatusText: 'Service Unavailable',
          addResponseHeaders: Math.random() < 0.5 ? this.addNoResponseHeaders : this.addRetryAfterResponseHeader
        }
        return mockFetchInfo;
      }
    }
  }

  private addNoResponseHeaders = (headers: Map<string, string>): void => {
    // don't add any headers
  }

  private addRetryAfterResponseHeader = (headers: Map<string, string>): void => {
    headers.set('Retry-After', '5');
  }

}

/**
 * This class is an implementation of `FetchInterface` that intentionally mocks `fetch` which is useful
 * for testing.
 */
export class MockingFetch implements FetchInterface {

  timeOfLastRateLimit = 0;
  mockFetchController: MockFetchController = new SimpleMockFetchController();

  public setMockFetchController = (mockFetchController: MockFetchController) => {
    this.mockFetchController = mockFetchController;
  }

  public fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    const mockFetchInfo = this.mockFetchController.getMockFetchInfo(this.timeOfLastRateLimit);
    this.timeOfLastRateLimit = new Date().getTime();
    if (mockFetchInfo) {
      const status: number = mockFetchInfo.responseStatusCode;
      const statusText = mockFetchInfo.responseStatusText;
      const _headers = new Map<string, string>();
      mockFetchInfo.addResponseHeaders(_headers);
      const headers: Headers = {
        forEach: (callback: (value: string, key: string, parent: Headers) => void, thisArg?: any): void => {
          throw new Error('TODO: Function not implemented.');
        },
        append: function (name: string, value: string): void {
          throw new Error('TODO: Function not implemented.');
        },
        delete: function (name: string): void {
          _headers.delete(name);
        },
        get: function (name: string): string {
          return _headers.get(name);
        },
        has: function (name: string): boolean {
          return _headers.has(name);
        },
        set: function (name: string, value: string): void {
          _headers.set(name, value);
        },
      }
      const rateLimitResponse: Response = {
        clone: function (): Response {
          throw new Error('TODO: Function not implemented.');
        },
        headers: headers,
        ok: false,
        redirected: false,
        status: status,
        statusText: statusText,
        type: 'default',
        url: url.toString(),
        arrayBuffer: function (): Promise<ArrayBuffer> {
          throw new Error('TODO: Function not implemented.');
        },
        blob: function (): Promise<Blob> {
          throw new Error('TODO: Function not implemented.');
        },
        body: undefined,
        bodyUsed: false,
        json: function (): Promise<any> {
          throw new Error('TODO: Function not implemented.');
        },
        text: function (): Promise<string> {
          throw new Error('TODO: Function not implemented.');
        },
        formData: function (): Promise<FormData> {
          throw new Error('TODO: Function not implemented.');
        }
      }
      return rateLimitResponse;
    } else {
      return await fetch(url, init);
    }
  }

}
