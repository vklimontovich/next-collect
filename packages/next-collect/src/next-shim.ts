import { NextRequest, NextResponse } from "next/server"
import {
  AbsoluteUrlPath,
  ClickId,
  getClickIdsFromQueryString,
  getFullUrl,
  getHostWithPort,
  getQueryString,
  getUtmsFromQueryString,
  isClickId,
  isDefaultPort,
  isUtmCode,
  PageEvent,
  PublicUrl,
  randomId,
  UrlProtocol,
  UtmCode,
} from "./index"
import { serialize } from "cookie"
import { NextApiRequest, NextApiResponse } from "next"
import { removeSuffix } from "./tools"
import * as url from "url"
import * as path from "path"

export const defaultCookieName = "_next-collect_id"

export type NextRequestShim<Req, Res> = {
  getAnonymousId: (
    cookieName: string | undefined | null,
    cookieDomain: string | undefined,
    req: Req,
    res: Res,
    url: PublicUrl
  ) => string | undefined

  getPageEvent: (eventType: string, url: PublicUrl, anonymousId: string | undefined, req: Req) => PageEvent

  parsePublicUrl: (req: Req) => PublicUrl
}

const getSingleHeader = (header: undefined | string | string[]) =>
  header && Array.isArray(header) ? header?.[0] : header

export const nextApiShim: NextRequestShim<NextApiRequest, NextApiResponse> = {
  getAnonymousId(cookieName, cookieDomain, req, res, url): string | undefined {
    if (cookieName === null) {
      return undefined
    } else if (cookieName === undefined) {
      cookieName = defaultCookieName
    }
    const id = req.cookies[cookieName]
    if (id) {
      return id
    } else {
      const newId = randomId()
      res.setHeader(
        "set-cookie",
        serialize(cookieName, newId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365 * 10,
          secure: url.protocol === "https",
          sameSite: url.protocol === "https" ? "strict" : "lax",
          domain: cookieDomain || undefined,
        })
      )
      return newId
    }
  },
  getPageEvent(eventType: string, url: PublicUrl, anonymousId: string | undefined, req: NextApiRequest): PageEvent {
    const acceptLanguageHeader = getSingleHeader(req.headers["accept-language"])
    const clickIds = getClickIdsFromQueryString(url.queryString)
    const utms = getUtmsFromQueryString(url.queryString)
    return {
      eventId: randomId(),
      eventType,
      ipAddress: (
        getSingleHeader(req.headers["x-real-ip"]) ||
        getSingleHeader(req.headers["x-forwarded-for"]) ||
        req.socket.remoteAddress ||
        "127.0.0.1"
      )
        .split(",")[0]
        .trim(),
      userLanguage: (acceptLanguageHeader && acceptLanguageHeader.split(",")[0]) || undefined,
      clickIds,
      host: getHostWithPort(url),
      path: url.path,
      queryString: getQueryString(url),
      referrer: getSingleHeader(req.headers["referer"]) || undefined,
      url: getFullUrl(url),
      userAgent: getSingleHeader(req.headers["user-agent"]) || undefined,
      utms,
      user: {
        anonymousId: anonymousId,
      },
    }
  },
  parsePublicUrl(req: NextApiRequest): PublicUrl {
    const getProtocolFromUrl = (url: string | undefined) => url && (url.indexOf("https://") === 0 ? "https" : "http")

    const [host, maybePort] = (
      getSingleHeader(req.headers["x-forwarded-host"]) ||
      getSingleHeader(req.headers["host"]) ||
      "localhost"
    ).split(":")
    const protocol = removeSuffix(
      getSingleHeader(req.headers["x-forwarded-proto"]) || getProtocolFromUrl(req.url) || "http",
      ["/", ":"]
    ) as UrlProtocol
    const port = isDefaultPort(protocol, maybePort || req.socket.localPort?.toString())
    if (!req.url) {
      throw new Error("Invalid request - url is not defined")
    }
    const parsedUrl = new URL(req.url, `${protocol}://${host}`)
    const queryString = [...parsedUrl.searchParams.entries()].reduce((map, [key, val]) => ({ ...map, [key]: val }), {})
    return { host, path: parsedUrl.pathname as AbsoluteUrlPath, protocol, port, queryString }
  },
}

export const pageMiddlewareShim: NextRequestShim<NextRequest, NextResponse> = {
  parsePublicUrl(req: NextRequest): PublicUrl {
    const [host, maybePort] = (
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      req.nextUrl.host ||
      "localhost"
    ).split(":")
    const protocol = removeSuffix(req.headers.get("x-forwarded-proto") || req.nextUrl.protocol || "http", [
      "/",
      ":",
    ]) as UrlProtocol
    const port = isDefaultPort(protocol, maybePort || req.nextUrl.port)
    const path = req.nextUrl.pathname as AbsoluteUrlPath
    const queryString = [...req.nextUrl.searchParams.entries()].reduce(
      (map, [key, val]) => ({ ...map, [key]: val }),
      {}
    )
    return { host, path, protocol, port, queryString }
  },
  getAnonymousId(
    cookieName: string | undefined | null,
    cookieDomain: string | undefined,
    req: NextRequest,
    res: NextResponse,
    url: PublicUrl
  ): string | undefined {
    if (cookieName === null) {
      return undefined
    } else if (cookieName === undefined) {
      cookieName = defaultCookieName
    }
    const id = req.cookies[cookieName]
    if (id) {
      return id
    } else {
      const newId = randomId()
      res.headers.set(
        "set-cookie",
        serialize(cookieName, newId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365 * 10,
          secure: url.protocol === "https",
          sameSite: url.protocol === "https" ? "strict" : "lax",
          domain: cookieDomain || undefined,
        })
      )
      return newId
    }
  },
  getPageEvent(eventType: string, url: PublicUrl, anonymousId: string | undefined, req: NextRequest): PageEvent {
    const acceptLanguageHeader = req.headers.get("accept-language")
    const clickIds = getClickIdsFromQueryString(url.queryString)
    const utms = getUtmsFromQueryString(url.queryString)
    return {
      eventId: randomId(),
      eventType,
      ipAddress: (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1")
        .split(",")[0]
        .trim(),
      userLanguage: (acceptLanguageHeader && acceptLanguageHeader.split(",")[0]) || undefined,
      clickIds,
      host: getHostWithPort(url),
      path: url.path,
      queryString: getQueryString(url),
      referrer: req.headers.get("referer") || undefined,
      url: getFullUrl(url),
      userAgent: req.headers.get("user-agent") || undefined,
      utms,
      user: {
        anonymousId: anonymousId,
      },
    }
  },
}
