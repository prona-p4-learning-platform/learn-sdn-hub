import { $fetch, FetchError, FetchOptions } from "ofetch";
import { destr } from "destr";
import { z } from "zod";

import config from "./Config";

type SafeParseSuccess<T> = {
  success: true;
  data: T;
  rawBody: string;
};

type SafeParseError = {
  success: false;
  error: Error;
  rawBody: string;
};

type SafeParse<T> = SafeParseSuccess<T> | SafeParseError;

function isObject(data: unknown): data is object {
  return typeof data === "object" && data !== null;
}

function isString(data: unknown): data is string {
  return typeof data === "string";
}

/**
 * Create a new fetch method with defaults and integrated validation.
 * Built around json payloads. If you want to send/receive other
 * payloads use $fetch.create() directly.
 *
 * @param defaults The fetch defaults.
 * @returns A fetch method which uses the given defaults.
 */
export function createCustomFetch(
  defaults: FetchOptions,
): <S extends z.ZodTypeAny>(
  path: string,
  validator: S,
  options?: FetchOptions<"json">,
) => Promise<SafeParse<z.TypeOf<S>>> {
  const customFetch = $fetch.create(defaults);
  const fetchMethod = <S extends z.ZodTypeAny>(
    path: string,
    validator: S,
    options?: FetchOptions<"json">,
  ) => {
    const defaultOptions = options ?? {};

    type ResultType = z.infer<typeof validator>;

    return customFetch<SafeParse<ResultType>>(path, {
      ...defaultOptions,
      parseResponse: (payload): SafeParse<ResultType> => {
        const defaultPayload = payload.trim() || "{}";

        try {
          const parsed = destr(defaultPayload, { strict: true });
          const validated = validator.parse(parsed) as ResultType;

          return {
            success: true,
            data: validated,
            rawBody: defaultPayload,
          };
        } catch (error) {
          let outputError: Error;
          if (error instanceof Error) outputError = error;
          else
            outputError = new Error(
              "Parsing the payload resulted in an unknown error.",
            );

          return {
            success: false,
            error: outputError,
            rawBody: defaultPayload,
          };
        }
      },
    });
  };

  return fetchMethod;
}

/**
 * Adds a custom header to an HeaderInit object. If the value is
 * undefined the header won't be added.
 *
 * @param headers The headers object.
 * @param name The name of the header.
 * @param value The value of the header.
 */
export function addRequestHeader(
  headers: HeadersInit,
  name: string,
  value: string | undefined,
): void {
  if (value) {
    if (Array.isArray(headers)) {
      const found = headers.find(([key, _oldValue]) => {
        return key === name;
      });

      if (found) found[1] = value;
      else headers.push([name, value]);
    } else if (headers instanceof Headers) {
      headers.set(name, value);
    } else {
      headers[name] = value;
    }
  }
}

export const httpStatusValidator = z.object({
  status: z.string(),
  message: z.string(),
});

type HttpError = z.infer<typeof httpStatusValidator>;

/**
 * Parses the http error body from an ofetch request.
 *
 * @param context The fetch context.
 * @returns The parsed http error.
 */
export async function getHttpError(
  context: FetchError,
): Promise<SafeParse<HttpError>> {
  try {
    const response = context.response;

    if (response) {
      let body = "";

      if (!response.bodyUsed) {
        body = (await response.text()).trim() || "{}";
      } else {
        const data = context.data as unknown;

        if (isObject(data) && "rawBody" in data && isString(data.rawBody)) {
          body = data.rawBody;
        } else throw new Error("Response data is undefined.");
      }

      const parsed = destr(body, { strict: true });
      const validated = httpStatusValidator.parse(parsed);

      return {
        success: true,
        data: validated,
        rawBody: body,
      };
    } else throw new Error("No response in context.");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error."),
      rawBody: "{}",
    };
  }
}

export const APIBasePath = import.meta.env.VITE_REACT_APP_API_HOST
  ? new URL("/api", config.backendURL).href
  : "/api";

/**
 * Fetch method for API requests.
 */
export const APIRequest = createCustomFetch({
  baseURL: APIBasePath,
  timeout: 30000,
  onRequest: (context) => {
    // inject auth token if possible
    const token = localStorage.getItem("token") ?? undefined;
    context.options.headers ??= {};

    addRequestHeader(context.options.headers, "authorization", token);
  },
});

/**
 * Fetch method for API requests without validation.
 */
export const APIRequestNV = $fetch.create({
  baseURL: APIBasePath,
  timeout: 30000,
  onRequest: (context) => {
    // inject auth token if possible
    const token = localStorage.getItem("token") ?? undefined;
    context.options.headers ??= {};

    addRequestHeader(context.options.headers, "authorization", token);
  },
});
