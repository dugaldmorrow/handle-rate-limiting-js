
/**
 * This interface abstracts the fetch implementation such that alternate fetch implementations
 * can be injected.
 */
export interface FetchInterface {
  fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
}

/**
 * This is the default fetch implementation to be used and simply uses the in-built `fetch` method.
 */
export class NodeFetch implements FetchInterface {

  fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return await fetch(url, init);
  }

}
