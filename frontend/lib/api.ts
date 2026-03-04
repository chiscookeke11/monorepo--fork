const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
  }

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("sheltaflex_token")
      : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers ?? {}),
  };

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      ...options,
      headers,
    });

    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || `API error: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `Cannot connect to backend at ${baseUrl}. Please ensure the backend server is running.`
      );
    }
    throw error;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}