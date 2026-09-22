export async function api(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  const responseText = await response.text();
  let body;
  try {
    body = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(
      `Dashboard API returned ${response.status} ${response.statusText}. Restart the dashboard and try again.`,
    );
  }
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

export function requestOptions(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
