export type UrlProtocol = "http" | "https"

export type AbsoluteUrlPath = `/${string}`

/**
 * Parsed url. Better than URL since it contains only data
 * and can be safely serialized to JSON and back
 */
export type DecomposedUrl = {
  /**
   * Protocol. Never contains `:`
   */
  protocol: UrlProtocol
  /**
   * Host without port
   */
  host: string
  /**
   * Only present if port are not default (not 80 for http and not 443 for https)
   */
  port?: string
  /**
   * All query parameters
   */
  queryString: Record<string, string>

  /**
   * Path always starts from `/`. Duplicated slashes are removed, slash at the end is kept if present
   */
  path: AbsoluteUrlPath
}

export function getUrlString(url: DecomposedUrl) {
  return `${url.protocol}://${getHostWithPort(url)}${url.path}${getQueryString(url)}`
}

export function getQueryString(url: DecomposedUrl) {
  return Object.keys(url.queryString).length === 0
    ? ""
    : "?" +
        Object.entries(url.queryString)
          .map(([name, val]) => `${name}=${encodeURIComponent(val)}`)
          .join("&")
}

export function getHostWithPort(url: DecomposedUrl) {
  return `${url.host}${url.port && ":" + url.port}`
}

export function isDefaultPort(protocol: UrlProtocol, port?: string): string | undefined {
  return (protocol === "http" && port === "80") || (protocol === "https" && port === "443") ? undefined : port
}
const publicSuffixes = ["vercel.app", "herokuapp.com", "co.uk", "com.au", "fly.dev", "fly.io"]

export function getPrimaryDomain(host: string) {
  const parts = host.split(".")
  if (parts.length <= 2) {
    return host
  } else {
    const primary = parts.slice(parts.length - 2).join(".")
    return new Set(publicSuffixes).has(primary.toLowerCase()) ? parts.slice(parts.length - 3).join(".") : primary
  }
}
