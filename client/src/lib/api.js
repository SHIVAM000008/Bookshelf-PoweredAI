
const API_URL = "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  // Only send Content-Type when we actually send JSON.
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}
