export type RemoteOptions = RequestInit & {
  payload?: any
  timeoutMs?: number
  userAgent?: string
  fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>
  retry?: {
    count?: number
    backoffMs?: number
  }
}

const maxErrorMessageLen = 5000
const defaultRequestTimout = maxErrorMessageLen

async function getErrorText(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text.length > maxErrorMessageLen
      ? `${text.substring(0, maxErrorMessageLen)}... (truncated; len=${text.length})`
      : text
  } catch (e) {
    console.error(`Failed to get error response body`, e)
    return "(failed to get response body; see logs)"
  }
}

export async function remoteCall(url: string, opts: RemoteOptions = {}): Promise<any> {
  const {
    payload,
    timeoutMs = defaultRequestTimout,
    userAgent = `remote-call timeout=${timeoutMs}`,
    fetch = globalThis.fetch,
    ...requestOptions
  } = opts
  if (!fetch) {
    throw new Error(`remoteCall: fetch not available as global, specify it with opts.fetch`)
  }
  requestOptions.headers = {
    ...(requestOptions.headers || {}),
    Accept: "application/json",
    "User-Agent": `remote-call timeout=${timeoutMs}`,
  }

  if (payload) {
    requestOptions.body = JSON.stringify(payload)
    requestOptions.headers = {
      ...requestOptions.headers,
      "Content-Type": "application/json",
    }
  }
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
    })
    clearTimeout(id)
    if (!response.ok) {
      return Promise.reject(new Error(`${response.status} ${response.statusText} ${await getErrorText(response)}`))
    } else {
      return response.json()
    }
  } catch (e: any) {
    clearTimeout(id)
    if (e?.name === "AbortError") {
      return Promise.reject(new Error(`${requestOptions.method || "GET"} ${url} timeouts after ${timeoutMs}ms`))
    } else {
      return Promise.reject(e)
    }
  }
}
