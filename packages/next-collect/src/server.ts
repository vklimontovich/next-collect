import { NextMiddleware, NextRequest, NextResponse } from "next/server"
import { deepMerge } from "./tools"
import {
  ClickId,
  PageEvent,
  PublicUrl,
  UserProperties,
  CollectOpts,
  parseEventTypesMap,
  safeCall,
  parseDriverShortcut,
  getEventHandler,
  defaultCollectApiRoute,
  ClientSideCollectRequest,
  isDebug,
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

export type DynamicOption<Req, Res, T> = ((req: Req, res: Res, originalEvent: any) => T) | T | undefined

function isSystemRequest(req: NextRequest) {
  return req.nextUrl.pathname.indexOf("/_next/") === 0
}

export function eventCollector(opts: CollectOpts): EventCollector {
  const eventTypeMaps = parseEventTypesMap(opts.eventTypes)
  return {
    async nextApiHandler(req: NextApiRequest, res: NextApiResponse, props) {
      const reqResShim: NextRequestShim<NextApiRequest, NextApiResponse> = nextApiShim

      try {
        const clientSideProps = req.body as ClientSideCollectRequest
        const clientSideEventProps = clientSideProps?.event || {}
        const extraProps = safeCall(
          () => getDynamicOption(props?.extend, {})(req, res, clientSideEventProps),
          ".props",
          {}
        )
        const url = reqResShim.parsePublicUrl(req)
        const eventType = clientSideProps ? clientSideProps.event.eventType : eventTypeMaps(url.path)
        if (!eventType) {
          return res
        }
        const anonymousId = reqResShim.getAnonymousId(
          getDynamicOption(props?.cookieName, defaultCookieName)(req, res, clientSideEventProps),
          getDynamicOption(props?.cookieDomain, undefined)(req, res, clientSideEventProps),
          req,
          res,
          url
        )
        const originalPageEvent = reqResShim.getPageEvent(eventType, url, anonymousId, req)
        const pageEvent: PageEvent<any> = deepMerge(originalPageEvent, clientSideEventProps, extraProps)
        const drivers = parseDriverShortcut(opts.drivers)
        if (isDebug()) {
          console.log(`Sending page event to ${drivers.map(d => d.type)}`, pageEvent)
        }
        for (const driver of drivers) {
          if (isDebug()) {
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
            .then(() => {
              if (isDebug()) {
                console.info(`${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""}) finished successfully`)
              }
            })
        }
        res.json({ ok: true })
      } catch (e: any) {
        res.json({ ok: false, error: `${e?.message || "Unknown error"}` })
        console.error()
      }
    },

    async nextJsPageMiddleware(req: NextRequest, res: NextResponse, props = undefined): Promise<NextResponse> {
      if (isSystemRequest(req)) {
        if (isDebug()) {
          console.log(`[DEBUG] Skip system request ${req.nextUrl.pathname}`)
        }
        return res
      }
      const reqResShim: NextRequestShim<NextRequest, NextResponse> = pageMiddlewareShim

      try {
        const extraProps = safeCall(() => getDynamicOption(props?.extend, {})(req, res, {}), ".props", {})
        const url = pageMiddlewareShim.parsePublicUrl(req)
        const eventType = eventTypeMaps(url.path)
        if (!eventType) {
          return res
        }
        const anonymousId = reqResShim.getAnonymousId(
          getDynamicOption(props?.cookieName, defaultCookieName)(req, res, {}),
          getDynamicOption(props?.cookieDomain, undefined)(req, res, {}),
          req,
          res,
          url
        )
        const originalPageEvent = reqResShim.getPageEvent(eventType, url, anonymousId, req)
        const pageEvent: PageEvent<any> = deepMerge(originalPageEvent, extraProps)
        const drivers = parseDriverShortcut(opts.drivers)
        if (isDebug()) {
          console.log(`Sending page event to ${drivers.map(d => d.type)}`, pageEvent)
        }
        for (const driver of drivers) {
          if (isDebug()) {
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
              if (isDebug()) {
                console.info(
                  `${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""}) finished successfully`,
                  r
                )
              }
            })
        }
        return res
      } catch (e: any) {
        console.error()
        return res
      }
    },
  }
}

function getDynamicOption<Req, Res, T>(
  o: DynamicOption<Req, Res, T>,
  defaultVal: T
): (req: Req, res: Res, originalEvent: any) => T {
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

export type NextCollectOpts = CollectOpts & NextMiddlewareOpts & NextApiHandlerOpts

export function collectEvents(opts: CollectOpts & NextMiddlewareOpts): NextMiddleware {
  return async (request, event) => {
    const response: Response = opts.middleware
      ? (await opts.middleware(request, event)) || NextResponse.next()
      : NextResponse.next()

    return eventCollector(opts).nextJsPageMiddleware(request, response, opts)
  }
}

export function collectApiHandler(opts: CollectOpts & NextApiHandlerOpts): NextApiHandler {
  return async (request, response) => {
    return eventCollector(opts).nextApiHandler(request, response, opts)
  }
}

/**
 * @deprecated use collectEvents instead
 */
export const nextEventsCollectApi = collectApiHandler
