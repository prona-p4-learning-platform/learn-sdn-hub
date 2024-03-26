export function createApiRequest(
  pathAndQuery: string,
  init?: RequestInit
): Request {
  if (pathAndQuery.startsWith("/") === false) {
    pathAndQuery = "/" + pathAndQuery;
  }
  const request = new Request(
    process.env.NEXT_PUBLIC_API_URL + pathAndQuery,
    init
  );
  return request;
}
