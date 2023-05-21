# Introduction

This library provides an implementation of the built in `fetch` method (see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) which will handle REST API responses such as *429 Too Many Requests* and *500 Internal Server Error* that may need retrying.

The library is designed to allow its behaviour to be modified by injecting implementations of classes that override default behaviour. This includes injecting alternate implementations of `fetch` such as one designed for mocking the behaviour for testing purposes.

The fetch behaviour is also configurable so its behaviour can be customised to suit different use cases.

# Usage

The library is designed for Node.js services and the built in `fetch` available in Node.js version 18 or later. Import the library as follows:

```
import { RateLimitingFetch, nonUiContextRateLimitingHandlingOptionsDefaults } from 'handle-rate-limiting-js';
```

Create an instance of `RateLimitingFetch` as follows:

```
const rateLimitingFetch = new RateLimitingFetch(nonUiContextRateLimitingHandlingOptionsDefaults);
```

Then call the `fetch` in the same way you would call the inbuilt `fetch` method. See  https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API.

```
rateLimitingFetch.fetch(url, options);
```

# Configuraing the fetch behaviour

To configure the fetch behaviour, construct `RateLimitingFetch` with a custom instance of `RateLimitingHandlingOptions` such as:

```
const myRateLimitingHandlingOptions: RateLimitingHandlingOptions = {
  maxRetries: 4,
  maxRetryDelayMillis: 120000,
  backoffMultiplier: 2,
  initialRetryDelayMillis: 10000,
  maxJitterMultiplier: 1.4,
}
const rateLimitingFetch = new RateLimitingFetch(myRateLimitingHandlingOptions);
```

# Testing

Testing can be achieved by mocking the behaviour of the `fetch` method using the `SimpleMockFetchController` as follows:

```
// Create the instance of RateLimitingFetch...
const rateLimitingFetch = new RateLimitingFetch(nonUiContextRateLimitingHandlingOptionsDefaults);

// Set the fetch implementation to our own MockingFetch instance...
const mockingFetch = new MockingFetch();
rateLimitingFetch.setFetchImplementation(mockingFetch);

// Set the MockingFetch controller...
const simpleMockFetchController = new SimpleMockFetchController();
mockingFetch.setMockFetchController(simpleMockFetchController);

// Cause the next fetch to return a rate limitng response...
const addRetryAfterResponseHeader = (headers: Map<string, string>): void => {
  headers.set('Retry-After', '5');
}
let nextMockFetchInfo: undefined | MockFetchInfo = {
  responseStatusCode: 429,
  responseStatusText: 'Too Many Requests',
  addResponseHeaders: addRetryAfterResponseHeader
}
simpleMockFetchController.setNextMockFetchInfo(nextMockFetchInfo);

// Now do something that will cause fetch to be invoked and check the result...
const response = await rateLimitingFetch.fetch(url, options);
assertTrue(response.status === 429);
```

# Mocking random rate limiting

To modify the fetch mplementation such that random 429 rate limiting,  internal server errors occur, using the following code:

```
// Create the instance of RateLimitingFetch...
const rateLimitingFetch = new RateLimitingFetch(nonUiContextRateLimitingHandlingOptionsDefaults);

// Set the fetch implementation to our own MockingFetch instance...
const mockingFetch = new MockingFetch();
rateLimitingFetch.setFetchImplementation(mockingFetch);

// Create an instance of RandomMockFetchController and inject it...
const randomMockFetchController = new RandomMockFetchController();
mockingFetch.setMockFetchController(randomMockFetchController);
```
