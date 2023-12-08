import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse, userAgent } from "next/server"
import {
  AnalyticsContext,
  AnalyticsInterface,
  AnalyticsServerEvent,
  createAnalytics,
  EventType,
  eventTypes,
  inferAnalyticsContextFields,
} from "segment-protocol"
import {
  AbsoluteUrlPath,
  DecomposedUrl,
  getPrimaryDomain,
  getQueryString,
  getUrlString,
  isDefaultPort,
  UrlProtocol,
} from "../isolibs/url"
import { NextMiddlewareResult } from "next/dist/server/web/types"
import {
  EventHydrationFunction,
  EventFilterFunction,
  NextCollectConfig,
  ServerDestinationLike,
  ServerRequest,
  ServerRequestContext,
} from "./config"
import { ConfigDefaults, nextConfigDefaults } from "./config.defaults"
import { coreDestinations, selfConfigurableDestinations, ServerDestination } from "./destinations"
import { NextApiRequest, NextApiResponse } from "next"
import {
  cookiePrefix,
  decodeCookie,
  encodeCookie,
  groupPersistKey,
  GroupProps,
  userPersistKey,
  UserProps,
} from "../isolibs/persist"
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

import * as cookie from "cookie"
import { randomId } from "../isolibs/lib"

/**
 * Parses next url
 */
function parseNextUrl(req: NextRequest): DecomposedUrl {
  const [host, maybePort] = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host ||
    "localhost"
  ).split(":")
  const protocol = (req.headers.get("x-forwarded-proto") || req.nextUrl.protocol || "http").split(":")[0] as UrlProtocol
  const port = isDefaultPort(protocol, maybePort || req.nextUrl.port)
  const path = req.nextUrl.pathname as AbsoluteUrlPath
  const queryString = [...req.nextUrl.searchParams.entries()].reduce((map, [key, val]) => ({ ...map, [key]: val }), {})
  return { host, path, protocol, port, queryString }
}

function getRequestIp(req: NextRequest): string | undefined {
  //it's not clear how to grap an IP from a NextRequest if it's not in headers
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.ip)?.split(",")[0] || undefined
}

function getServerRequest(req: NextRequest): ServerRequest {
  const decomposedUrl = parseNextUrl(req)
  return {
    isApi: req.nextUrl.pathname.startsWith("/api"),
    isNextInternal: req.nextUrl.pathname.startsWith("/_next"),
    isStatic: req.nextUrl.pathname.startsWith("/favicon"),
    getCookie: s => {
      //req.cookie.get has invalid type definition, it returns object with value property
      const cookie = req.cookies.get(s) as any
      return typeof cookie === "string"
        ? decodeCookie(cookie)
        : typeof cookie === "object" && cookie.value
        ? cookie.value
        : undefined
    },
    q: s => req.nextUrl.searchParams.get(s) || undefined,
    header(s: string): string | undefined {
      const val = req.headers.get(s.toLowerCase())
      return val && Array.isArray(val) ? val.join(",") : val || undefined
    },
    isPrefetch: !!req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch",
    path: req.nextUrl.basePath + req.nextUrl.pathname,
    externalUrl: {
      url: getUrlString(decomposedUrl),
      decomposed: decomposedUrl,
    },
    nextRequest: req,
    ip: getRequestIp(req),
  }
}

function getServerRequestContext(req: ServerRequest, res: NextResponse): ServerRequestContext {
  return {
    ...req,
    nextResponse: res,
    clearCookie: name => {
      if (res.cookies) {
        res.cookies.delete(name)
      } else if (res.headers) {
        res.headers.set(
          "set-cookie",
          cookie.serialize(name, "", {
            maxAge: -1,
            path: "/",
          })
        )
      } else {
        console.debug(`Can't delete cookie ${name} - nor headers, neither cookies are available in response`)
      }
    },
    setCookie: (name, val, opts) => {
      const secure = req.externalUrl.decomposed.protocol === "https"
      const cookieOpts = {
        domain: opts.cookieDomain,
        path: "/",
        httpOnly: false,
        secure,
        //expire in one year
        maxAge: 24 * 60 * 60 * 365,
        sameSite: secure ? "none" : "lax",
      } as Omit<Partial<ResponseCookie>, "expires">
      //console.debug(`setCookie ${name}=${val} with`, cookieOpts)
      const encodedVal = encodeCookie(val)
      if (res.cookies) {
        res.cookies.set(name, encodedVal, cookieOpts)
      } else if (res.headers) {
        const setCookieHeader = cookie.serialize(name, "", cookieOpts)
        res.headers.set("set-cookie", setCookieHeader)
        //console.debug(`set-cookie header: ${setCookieHeader}`)
      } else {
        console.debug(`Can't set cookie ${name}=${val} - nor headers, neither cookies are available in response`)
      }
    },
  }
}

const defaultFilter: (opts: NextCollectConfig) => EventFilterFunction = opts => {
  return (req: ServerRequest) => {
    if (req.isPrefetch || req.isNextInternal || req.isApi || req.isStatic) {
      return false
    }
    return "page"
  }
}

export type RequiredAnalyticsContext = Required<Omit<AnalyticsContext, "page" | "metrics">> & {
  page: Required<AnalyticsContext["page"]>
}

function getDomain(referrer: string) {
  try {
    return referrer ? new URL(referrer).hostname : ""
  } catch (e) {
    return ""
  }
}

export function setAnonymousId(ctx: ServerRequestContext, cookieName: string, cookieDomain: string): string {
  const cookieValue = ctx.getCookie(cookieName)
  if (cookieValue) {
    return cookieValue
  }
  const newId = randomId()
  ctx.setCookie(cookieName, newId, { cookieDomain })
  return newId
}

export type Geo = {
  country?: string
  region?: string
  city?: string
  timezone?: string
  postalCode?: string
  location?: {
    lat?: number
    lon?: number
  }
}

/**
 * If the app deployed on Vercel, get a certain info that will be propagated to
 */
function getVercelEnvironment(): { deployId?: string; env?: string } | undefined {
  if (process.env.VERCEL) {
    return {
      deployId: process.env.VERCEL_GITHUB_COMMIT_SHA,
      env: process.env.VERCEL_ENV,
    }
  }
  return undefined
}

function getVercelGeo(req: ServerRequest): Geo {
  const latitude = req.header("x-vercel-ip-latitude")
  const longitude = req.header("x-vercel-ip-longitude")
  return {
    country: req.header("x-vercel-ip-country"),
    region: req.header("x-vercel-ip-country-region"),
    city: req.header("x-vercel-ip-city"),
    timezone: req.header("x-vercel-ip-timezone"),
    location:
      longitude || latitude
        ? { lat: latitude ? parseFloat(latitude) : undefined, lon: longitude ? parseFloat(longitude) : undefined }
        : undefined,
  }
}

const defaultHydration: EventHydrationFunction = async (event, req) => {
  if (req.header("x-vercel-ip-country")) {
    event.context.geo = getVercelGeo(req)
  }
  //add vercel deploy id and env if present
  event.properties = {
    ...event.properties,
    ...(getVercelEnvironment() || {}),
  }
  const matchedPath = req.header("x-matched-path")
  if (matchedPath) {
    if (!event.context.page) {
      event.context.page = {}
    }
    event.context.page.matchedPath = matchedPath
  }
}

/**
 * A type that represents config merged with defaults
 */
export type NextCollectConfigWithDefaults = Omit<NextCollectConfig, keyof ConfigDefaults & "cookieDomain"> &
  ConfigDefaults & { cookieDomain: string }

async function handleCollectApiRequest(
  req: ServerRequest,
  opts: NextCollectConfigWithDefaults,
  dests: ServerDestination[]
): Promise<NextMiddlewareResult> {
  //In some cases httpRequest can be undefined, however if this method is called it's not possible
  if (req.nextRequest.method !== "POST") {
    return NextResponse.json({ error: `Only POST is supported. Received ${req.nextRequest.method}` }, { status: 405 })
  }
  if (!req.nextRequest.body) {
    return NextResponse.json({ error: `Empty body` }, { status: 405 })
  }
  if (typeof req.nextRequest.body !== "object") {
    return NextResponse.json({ error: `Invalid body type ${typeof req.nextRequest.body}` }, { status: 405 })
  }
  const reqJson = (await req.nextRequest.json()) as any
  //Partial validation of the body, make sure that the most important
  //params are present
  if (!reqJson.messageId) {
    return NextResponse.json(
      { error: `Malformed request, messageId is not present in request`, request: reqJson },
      { status: 400 }
    )
  }
  if (!reqJson.type) {
    return NextResponse.json(
      { error: `Malformed request, type is not present in request`, request: reqJson },
      { status: 400 }
    )
  }
  const okResponse = NextResponse.json({ ok: true })
  const serverRequestContext = getServerRequestContext(req, okResponse)
  const body = reqJson as AnalyticsServerEvent
  //if anonymous id is provided, respect anonymous id from cookie
  if (!body.anonymousId) {
    body.anonymousId = setAnonymousId(serverRequestContext, opts.cookieName, opts.cookieDomain)
  }
  body.requestIp = body.ip = req.ip
  body.receivedAt = new Date().toISOString()
  await eventPipeline(body, serverRequestContext, opts, dests)
  return okResponse
}

function parse<T = any>(what: string, str?: string): T | undefined {
  if (!str) {
    return undefined
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    console.error(`Can't parse ${what}, val=${str}`, e)
    return undefined
  }
}

async function execMiddleware(
  middleware: NextMiddleware,
  request: NextRequest,
  event: NextFetchEvent
): Promise<NextResponse | undefined> {
  const result = await middleware(request, event)
  const resultObject: NextMiddlewareResult = result instanceof Promise ? await result : result
  if (resultObject) {
    if (resultObject instanceof NextResponse) {
      return resultObject
    } else {
      throw new Error(
        `Middleware returned invalid result: ${typeof resultObject}. next-collect supports only wrapping middlewares that return NextResponse`
      )
    }
  }
  return undefined
}

async function eventPipeline(
  event: AnalyticsServerEvent,
  req: ServerRequestContext,
  opts: NextCollectConfigWithDefaults,
  drivers: ServerDestination[]
): Promise<AnalyticsServerEvent> {
  if (!event.timestamp) {
    event.timestamp = event.sentAt || new Date().toISOString()
  }
  const eventEnrichmentResult = (opts.hydrate || defaultHydration)(event, req, ev =>
    defaultHydration(ev, req, () => {})
  )
  if (eventEnrichmentResult instanceof Promise) {
    //wait if needed
    await eventEnrichmentResult
  }
  //ideally, group id and user id should be set by enrichment function
  //but if they not there, last attempt would be to get them from cookies that could
  //be set earlier either by client .identify() call or
  //server .identify() call (does server really sets a cookie?)
  //  -or-
  //if groupId/userId is present and event type is group/identify, we should set cookie
  //for using on a client

  if (!event.groupId) {
    event.groupId = parse<GroupProps>(
      `cookie ${cookiePrefix}${groupPersistKey}`,
      req.getCookie(`${cookiePrefix}${groupPersistKey}`)
    )?.groupId
  } else if (event.type === "group") {
    req.setCookie(`${cookiePrefix}${groupPersistKey}`, JSON.stringify({ groupId: event.groupId }), {
      cookieDomain: opts.cookieDomain,
    })
  }
  if (!event.userId) {
    event.userId = parse<UserProps>(
      `cookie ${cookiePrefix}${groupPersistKey}`,
      req.getCookie(`${cookiePrefix}${userPersistKey}`)
    )?.userId
  } else if (event.type === "group") {
    req.setCookie(`${cookiePrefix}${groupPersistKey}`, JSON.stringify({ groupId: event.groupId }), {
      cookieDomain: opts.cookieDomain,
    })
  }

  const downstream: Promise<void>[] = drivers.map(async driver => {
    try {
      await driver.on({ event, req })
    } catch (e) {
      console.error(`Driver ${driver.describe()} failed to process event ${event.messageId}`, e)
    }
  })
  try {
    await Promise.all(downstream)
  } catch (e) {
    console.error(`One of the drivers failed to process event ${event.messageId}. See logs above`, e)
  }
  return event
}

const eventTypesSet = new Set<string>(eventTypes)

async function handleDebugRequest(_req: ServerRequest, opts: NextCollectConfigWithDefaults) {
  const eventType = _req.q("type") || "page"
  const path = _req.q("path") || _req.path
  const req = { ..._req, path }
  const response = NextResponse.next()
  const serverRequestContext = getServerRequestContext(req, response)

  const event = createAnalyticsEvent(serverRequestContext, opts, eventType)

  await eventPipeline(event, serverRequestContext, opts, [])
  //there's a potential problem here, a custom enrichment function can modify response,
  //bot those modifications are ignored here. We can live with it since it's for debugging only
  return NextResponse.json(event, { status: 200 })
}

function createAnalyticsEvent(
  serverRequest: ServerRequestContext,
  opts: NextCollectConfigWithDefaults,
  eventType: string
): AnalyticsServerEvent {
  const parsedUserAgent = userAgent(serverRequest.nextRequest) as any
  //remove ua field, since it could lead to duplication of user agent info
  delete parsedUserAgent["ua"]
  const referrer = serverRequest.header("referer") || ""
  const context: RequiredAnalyticsContext = inferAnalyticsContextFields({
    ip: serverRequest.ip,
    locale: (serverRequest.header("accept-language") || "").split(",")[0],
    userAgent: serverRequest.header("user-agent"),
    userAgentInfo: parsedUserAgent,
    library: {
      name: "next-collect",
      version: "0.0.0",
    },
    page: {
      //not possible to get an encoding from server context. That's fine,
      //it looks like a legacy parameter
      //encoding: ???
      referrer: referrer,
      title: "",
      url: serverRequest.externalUrl.url,
    },
  }) as RequiredAnalyticsContext
  const anonymousId = setAnonymousId(serverRequest, opts.cookieName, opts.cookieDomain)
  let isKnownEventType = eventTypesSet.has(eventType.toLowerCase())
  return {
    requestIp: serverRequest.ip,
    type: isKnownEventType ? (eventType as EventType) : "track",
    name: isKnownEventType ? undefined : eventType,
    context,
    anonymousId,
    timestamp: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    messageId: randomId(),
    properties: {},
    userId: "",
    groupId: "",
  }
}

function getDestinationChain(opts: {
  cookieDomain?: string
  filter?: EventFilterFunction
  async?: boolean
  debugRoute?: boolean
  destinations?: ServerDestinationLike[]
  hydrate?: EventHydrationFunction
  cookieName: string
  apiRoute: string
  middleware?: NextMiddleware
}) {
  return (opts.destinations || selfConfigurableDestinations)
    .map((d: ServerDestinationLike) => {
      if (!d) {
        return undefined
      } else if (typeof d === "string") {
        const destination = coreDestinations[d]
        if (!destination) {
          throw new Error(`Unknown destination ${d}`)
        }
        return destination.create(destination.defaults)
      } else if (typeof d === "object" && typeof d.type === "string") {
        const destination = coreDestinations[d.type]
        if (!destination) {
          throw new Error(`Unknown destination ${d}`)
        }
        return destination.create({ ...destination.defaults, ...d.config })
      } else if (typeof d === "object" && typeof d.type === "object") {
        return d.type.create({ ...d.type.defaults, ...d.config })
      } else {
        throw new Error(`Can't parse destination definition ${d} - unknown structure`)
      }
    })
    .filter(d => !!d) as ServerDestination[]
}

/**
 * Checks if the request will end up in a 404 page. This is a very hacky way to do it,
 * and it works only on vercel
 */
function is404(req: NextRequest) {
  return false
  //the line about doesn't work for some readson
  //return !!(req.headers.get("x-vercel-deployment-url") && !req.headers.get("x-matched-path"))
}

export function nextCollectMiddleware(_opts: NextCollectConfig & { middleware?: NextMiddleware } = {}): NextMiddleware {
  return async (request, event) => {
    const serverRequest = getServerRequest(request)
    const opts = { ...nextConfigDefaults, ..._opts }
    const cookieDomain = opts.cookieDomain || getPrimaryDomain(serverRequest.externalUrl.decomposed.host)

    const destinationExecChain: ServerDestination[] = getDestinationChain(opts)

    if (request.nextUrl.pathname === opts.apiRoute) {
      return handleCollectApiRequest(serverRequest, { ...opts, cookieDomain }, destinationExecChain)
    } else if (opts.debugRoute && request.nextUrl.pathname === opts.apiRoute + "/debug") {
      return handleDebugRequest(serverRequest, { ...opts, cookieDomain })
    }

    //Construct response ahead of time, if there's an underlying middleware.
    const response: NextResponse = opts.middleware
      ? (await execMiddleware(opts.middleware, request, event)) || NextResponse.next()
      : NextResponse.next()

    const eventType = (opts.filter || defaultFilter(opts))(serverRequest)
    if (!eventType) {
      //ignore request, filter told us to skip it
      return response
    }
    const serverRequestContext = getServerRequestContext(serverRequest, response)
    const analyticsEvent = createAnalyticsEvent(serverRequestContext, { ...opts, cookieDomain }, eventType)
    if (is404(request)) {
      if (!analyticsEvent.properties) {
        //initialize properties if needed
        analyticsEvent.properties = {}
      }
      analyticsEvent.properties["pageNotFound"] = true
    }
    await eventPipeline(analyticsEvent, serverRequestContext, { ...opts, cookieDomain }, destinationExecChain)
    return response
  }
}

export function nextCollect(
  _req: NextRequest | NextApiRequest,
  _res: NextResponse | NextApiResponse,
  _opts: NextCollectConfig
): { analytics: AnalyticsInterface } {
  //although we technically it's possible, we don't support
  //calling nextCollect() from API routes yet.
  if (!(_req as any).nextUrl) {
    throw new Error(
      `nextCollect() can't be used in API routes yet. Consider switching to app router (https://nextjs.org/docs/app)`
    )
  }

  const req = _req as NextRequest
  const res = _res as NextResponse

  const serverRequestContext = getServerRequestContext(getServerRequest(req), res)

  const opts: NextCollectConfigWithDefaults = {
    ...nextConfigDefaults,
    ..._opts,
    cookieDomain: getPrimaryDomain(serverRequestContext.externalUrl.decomposed.host),
  }

  const destinationChain: ServerDestination[] = getDestinationChain(opts)

  const analytics = createAnalytics({
    template: ({ type, name }) => {
      return createAnalyticsEvent(serverRequestContext, opts, name || type)
    },
    handler: async event => {
      await eventPipeline(event, serverRequestContext, opts, destinationChain)
    },
    handleReset: () => {
      serverRequestContext.clearCookie(`${cookiePrefix}${userPersistKey}`)
      serverRequestContext.clearCookie(`${cookiePrefix}${groupPersistKey}`)
    },
  }) as AnalyticsInterface

  return { analytics }
}

export * from "./destinations"
export * from "./config"
export * from "./config.defaults"
