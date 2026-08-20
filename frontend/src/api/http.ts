export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다.", 0, "NETWORK_ERROR");
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "API 응답 형식을 확인할 수 없습니다.",
      response.status,
      "INVALID_API_RESPONSE",
    );
  }

  const data = (await response.json()) as T & { code?: string; message?: string };

  if (!response.ok) {
    throw new ApiError(
      data.message ?? "요청을 처리하지 못했습니다.",
      response.status,
      data.code ?? "API_ERROR",
    );
  }

  return data;
}

export function isApiUnavailable(error: unknown) {
  return error instanceof ApiError && (
    error.status === 0 ||
    error.status === 404 ||
    error.status === 405 ||
    error.status === 502 ||
    error.status === 503 ||
    error.code === "INVALID_API_RESPONSE"
  );
}
