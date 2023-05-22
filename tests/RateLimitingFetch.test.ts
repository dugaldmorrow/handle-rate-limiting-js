import { RateLimitingFetch } from '../src/RateLimitingFetch';
import { nonUiContextRateLimitingHandlingOptionsDefaults } from '../src/RateLimitingHandlingOptions';
import { MockFetchInfo, MockingFetch, SimpleMockFetchController } from '../src/MockingFetch';

// The fetch parameters to test with...
const dadJokeId = '0189hNRf2g';
const dadJokeUrl = `https://icanhazdadjoke.com/j/${dadJokeId}`;
const options: RequestInit = {
  headers: {
    'User-Agent': 'RateLimitingFetch (https://github.com/dugaldmorrow/handle-rate-limiting-js)',
    'Accept': 'application/json'
  }
}

describe("RateLimitingFetch", () => {
  test("it should enable APIs to be mocked with 429 responses ans subsequently called successfully...", async () => {
    // Our instance of RateLimitingFetch to test with...
    const rateLimitingFetch = new RateLimitingFetch(nonUiContextRateLimitingHandlingOptionsDefaults);

    // Set the fetch implementation to our own MockingFetch instance...
    const mockingFetch = new MockingFetch();
    rateLimitingFetch.setFetchImplementation(mockingFetch);

    // Create an instance of RandomMockFetchController and inject it...
    const simpleMockFetchController = new SimpleMockFetchController();
    mockingFetch.setMockFetchController(simpleMockFetchController);

    // Cause the next fetch to return a 429 response...
    const addRetryAfterResponseHeader = (headers: Map<string, string>): void => {
      headers.set('Retry-After', '5');
    }
    let nextMockFetchInfo: undefined | MockFetchInfo = {
      responseStatusCode: 429,
      responseStatusText: 'Too Many Requests',
      addResponseHeaders: addRetryAfterResponseHeader
    }
    simpleMockFetchController.setNextMockFetchInfo(nextMockFetchInfo);

    // Attempt to fetch the joke, but with the fetch operation mocked to return a 429 response...
    const expected429Response = await rateLimitingFetch.fetch(dadJokeUrl, options);
    expect(expected429Response.status === 429);

    // Clear the mocked error so that the next fetch is successful...
    simpleMockFetchController.setNextMockFetchInfo(undefined);

    // Fetch the joke...
    const expected200Response = await rateLimitingFetch.fetch(dadJokeUrl, options);
    expect(expected200Response.status === 200);
    const json = await expected200Response.json();
    expect(json.id === dadJokeId);
  });
});