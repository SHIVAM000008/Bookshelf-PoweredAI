const API_URL = "http://localhost:5000/api";

export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export async function apiRequest(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong"
    );

    error.status = response.status;

    throw error;
  }

  return data;
}
