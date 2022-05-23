import { NextMiddleware, NextRequest, NextResponse } from "next/server"
import { serialize } from "cookie"
import { deepMerge, removeSuffix } from "./tools"
import {
  ClickId,
  PageEvent,
  PublicUrl,
  isUtmCode,
  UtmCode,
  getHostWithPort,
  getQueryString,
  getFullUrl,
  isClickId,
  UserProperties,
  UrlProtocol,
  AbsoluteUrlPath,
  EventSinkOpts,
  parseEventTypesMap,
  safeCall,
  parseDriverShortcut,
  getEventHandler,
  randomId,
  defaultCollectApiRoute,
  ClientSideCollectRequest,
  ClientSideCollectResponse,
  isDefaultPort,
} from "./index"
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { IncomingMessage } from "http"
import { defaultCookieName, nextApiShim, NextRequestShim, pageMiddlewareShim } from "./next-shim"

export type EventCollector = {
  nextApiHandler<U extends PageEvent = PageEvent, P extends UserProperties = UserProperties>(
    req: NextApiRequest,
    res: NextApiResponse,
    opts: NextApiHandlerOpts
  ): Promise<any>
  nextJsPageMiddleware<U extends PageEvent = PageEvent, P extends UserProperties = UserProperties>(
    req: NextRequest,
    res: Response,
    props?: NextMiddlewareOpts
  ): Promise<NextResponse>
}

export function parsePublicUrlNodeApi(req: IncomingMessage): PublicUrl {
  throw new Error("Not implemeted")
}

export type DynamicOption<Req, Res, T> = ((req: Req, res: Res) => T) | T | undefined

export function eventCollector(opts: EventSinkOpts): EventCollector {
  const eventTypeMaps = parseEventTypesMap(opts.eventTypes)
  return {
    async nextApiHandler(req: NextApiRequest, res: NextApiResponse, props) {
      const reqResShim: NextRequestShim<NextApiRequest, NextApiResponse> = nextApiShim

      try {
        const extraProps = safeCall(() => getDynamicOption(props?.extend, {})(req, res), ".props", {})
        const clientSideProps = req.body as ClientSideCollectRequest
        const url = reqResShim.parsePublicUrl(req)
        const eventType = clientSideProps ? clientSideProps.event.eventType : eventTypeMaps(url.path)
        if (!eventType) {
          return res
        }
        const anonymousId = reqResShim.getAnonymousId(
          getDynamicOption(props?.cookieName, defaultCookieName)(req, res),
          getDynamicOption(props?.cookieDomain, undefined)(req, res),
          req,
          res,
          url
        )
        const originalPageEvent = reqResShim.getPageEvent(eventType, url, anonymousId, req)
        const pageEvent: PageEvent<any> = deepMerge(originalPageEvent, extraProps, clientSideProps?.event || {})
        const drivers = parseDriverShortcut(opts.drivers)
        if (opts.debug) {
          console.log(`Sending page event to ${drivers.map(d => d.type)}`, pageEvent)
        }
        for (const driver of drivers) {
          if (opts.debug) {
            console.log(`Sending data to ${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""})`)
          }
          getEventHandler(driver)(pageEvent, { fetch })
            .catch(e => {
              if (opts.errorHandler) {
                opts.errorHandler(driver.type, e)
              } else {
                console.warn(`[WARN] Can't send data to ${driver.type}`, e)
              }
            })
            .then(r => {
              if (opts?.debug) {
                console.info(
                  `${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""}) finished successfully`,
                  r
                )
              }
            })
        }
        res.json({ ok: true })
      } catch (e: any) {
        res.json({ ok: false, error: `${e?.message || "Unknown error"}` })
        console.error(
          `[next-collect] Unexpected error during collecti api call. This doesn't break the app, but event won't be properly tracked.`,
          e
        )
      }
    },

    async nextJsPageMiddleware(req: NextRequest, res: NextResponse, props = undefined): Promise<NextResponse> {
      const reqResShim: NextRequestShim<NextRequest, NextResponse> = pageMiddlewareShim

      const isCsrRequest =
        props?.exposeEndpoint !== null && req.nextUrl.pathname === (props?.exposeEndpoint || defaultCollectApiRoute)
      try {
        const extraProps = safeCall(() => getDynamicOption(props?.extend, {})(req, res), ".props", {})
        const clientSideProps = isCsrRequest ? ((await req.json()) as ClientSideCollectRequest) : null
        const url = pageMiddlewareShim.parsePublicUrl(req)
        if (isCsrRequest && !clientSideProps?.event?.eventType) {
          throw new Error(
            `Malformed ${
              props?.exposeEndpoint || defaultCollectApiRoute
            } request - missing event.eventType. Request: ${JSON.stringify(clientSideProps)}`
          )
        }
        const eventType = clientSideProps ? clientSideProps.event.eventType : eventTypeMaps(url.path)
        if (!eventType) {
          return res
        }
        const anonymousId = reqResShim.getAnonymousId(
          getDynamicOption(props?.cookieName, defaultCookieName)(req, res),
          getDynamicOption(props?.cookieDomain, undefined)(req, res),
          req,
          res,
          url
        )
        const originalPageEvent = reqResShim.getPageEvent(eventType, url, anonymousId, req)
        const pageEvent: PageEvent<any> = deepMerge(
          originalPageEvent,
          {
            pageName: req.page.name,
            pageProps: JSON.stringify(req.page.params),
          },
          extraProps,
          clientSideProps?.event || {}
        )
        const drivers = parseDriverShortcut(opts.drivers)
        if (opts.debug) {
          console.log(`Sending page event to ${drivers.map(d => d.type)}`, pageEvent)
        }
        for (const driver of drivers) {
          if (opts.debug) {
            console.log(`Sending data to ${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""})`)
          }
          getEventHandler(driver)(pageEvent, { fetch })
            .catch(e => {
              if (opts.errorHandler) {
                opts.errorHandler(driver.type, e)
              } else {
                console.warn(`[WARN] Can't send data to ${driver.type}`, e)
              }
            })
            .then(r => {
              if (opts?.debug) {
                console.info(
                  `${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""}) finished successfully`,
                  r
                )
              }
            })
        }
        return clientSideProps ? NextResponse.json({ ok: true }) : res
      } catch (e: any) {
        if (!isCsrRequest) {
          console.error(
            `[EventSink - WARNING] Unexpected error during event sink processing. This doesn't break the app, however event won't be properly tracked.`,
            e
          )
          return res
        } else {
          console.error(
            `[EventSink - WARNING] Unexpected error CSR processing at ${req.nextUrl.pathname}. This doesn't break the app, however event won't be properly tracked.`,
            e
          )
          return NextResponse.json({ ok: false, error: `${e?.message || "Unknown error"}` })
        }
      }
    },
  }
}

function getDynamicOption<Req, Res, T>(o: DynamicOption<Req, Res, T>, defaultVal: T): (req: Req, res: Res) => T {
  if (o === undefined) {
    return () => defaultVal
  } else if (typeof o === "function") {
    return o as (req: Req, res: Res) => T
  }
  return () => o
}

export type NextMiddlewareOpts<
  U extends PageEvent = PageEvent & any,
  P extends UserProperties = UserProperties & any
> = {
  middleware?: NextMiddleware
  exposeEndpoint?: string | undefined | null
  cookieName?: DynamicOption<NextRequest, NextResponse, string>
  cookieDomain?: DynamicOption<NextRequest, NextResponse, string>
  extend?: DynamicOption<NextRequest, NextResponse, U>
}

export type NextApiHandlerOpts<
  U extends PageEvent = PageEvent & any,
  P extends UserProperties = UserProperties & any
> = {
  cookieName?: DynamicOption<NextApiRequest, NextApiResponse, string>
  cookieDomain?: DynamicOption<NextApiRequest, NextApiResponse, string>
  extend?: DynamicOption<NextApiRequest, NextApiResponse, U>
}

export function collectEvents(opts: EventSinkOpts & NextMiddlewareOpts): NextMiddleware {
  return async (request, event) => {
    const response: Response = opts.middleware
      ? (await opts.middleware(request, event)) || NextResponse.next()
      : NextResponse.next()

    return eventCollector(opts).nextJsPageMiddleware(request, response, opts)
  }
}

export function collectApiHandler(opts: EventSinkOpts & NextApiHandlerOpts): NextApiHandler {
  return async (request, response) => {
    return eventCollector(opts).nextApiHandler(request, response, opts)
  }
}

export function nextEventsCollectApi(opts: EventSinkOpts & NextApiHandlerOpts): NextApiHandler {
  return (req, res) => eventCollector(opts).nextApiHandler(req, res, opts)
}
