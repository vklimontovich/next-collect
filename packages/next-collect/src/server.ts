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
import { consoleLog } from "./log"

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

/**
 * A facade function that gets header from NextRequest or NextApiRequest.
 *
 * In case of multiple headers with the same name, values will be separated by `,`
 */
export function getHeader(req: NextRequest | NextApiRequest, h: string): string | undefined {
  if (req instanceof NextRequest) {
    return req.headers.get(h.toLowerCase()) || undefined
  } else {
    const val = req.headers[h.toLowerCase()]
    if (val && Array.isArray(val)) {
      return val.join(",")
    } else {
      return val
    }
  }
}

export function getAllHeaders(req: NextRequest | NextApiRequest): Record<string, string> {
  return (req instanceof NextRequest ? [...req.headers.entries()] : [...Object.entries(req.headers)])
    .sort(([name1], [name2]) => name1.localeCompare(name2))
    .reduce((acc, [name, val]) => ({ ...acc, [name]: Array.isArray(val) ? val.join(",") : val }), {})
}

/**
 * A facade function that gets cookie val from NextRequest or NextApiRequest
 */
export function getCookie(req: NextRequest | NextApiRequest, name: string): string | undefined {
  return req instanceof NextRequest ? req.cookies.get(name) : req.cookies[name]
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
          "nextApiHandler.props",
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
          consoleLog.log(`Sending page event to ${drivers.map(d => d.type)}: ${JSON.stringify(pageEvent)}`)
        }
        const allDrivers: Promise<void>[] = []
        for (const driver of drivers) {
          const startTime = new Date().getTime()
          if (isDebug()) {
            consoleLog.log(`Sending data to ${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""})`)
          }
          const promise = new Promise<void>(resolve => {
            getEventHandler(driver)(pageEvent, { fetch, log: consoleLog })
              .catch(e => {
                if (opts.errorHandler) {
                  opts.errorHandler(driver.type, e)
                } else {
                  consoleLog.warn(`Can't send data to ${driver.type}`, e)
                }
                resolve()
              })
              .then(() => {
                if (isDebug()) {
                  consoleLog.info(
                    `${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""}) finished successfully ${
                      new Date().getTime() - startTime
                    }ms`
                  )
                }
                resolve()
              })
          })
          allDrivers.push(promise)
        }
        await Promise.all(allDrivers)
        res.json({ ok: true })
      } catch (e: any) {
        res.json({ ok: false, error: `${e?.message || "Unknown error"}` })
        consoleLog.error(e?.message || "Unknown error", e)
      }
    },

    async nextJsPageMiddleware(req: NextRequest, res: NextResponse, props = undefined): Promise<NextResponse> {
      if (!props?.processSystemRequests && isSystemRequest(req)) {
        if (isDebug()) {
          consoleLog.debug(`Skip system request ${req.nextUrl.pathname}`)
        }
        return res
      }
      const reqResShim: NextRequestShim<NextRequest, NextResponse> = pageMiddlewareShim

      try {
        const extraProps = safeCall(
          () => getDynamicOption(props?.extend, {})(req, res, {}),
          "nextJsPageMiddleware.props",
          {}
        )
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
          consoleLog.log(`Sending page event to ${drivers.map(d => d.type)}`, pageEvent)
        }
        for (const driver of drivers) {
          if (isDebug()) {
            consoleLog.log(`Sending data to ${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""})`)
          }
          const startTime = new Date().getTime()
          getEventHandler(driver)(pageEvent, { fetch, log: consoleLog })
            .catch(e => {
              if (opts.errorHandler) {
                opts.errorHandler(driver.type, e)
              } else {
                consoleLog.warn(`[WARN] Can't send data to ${driver.type}`, e)
              }
            })
            .then(r => {
              if (isDebug()) {
                consoleLog.debug(
                  `${driver.type}(${driver.opts ? JSON.stringify(driver.opts) : ""}) finished successfully in ${
                    new Date().getTime() - startTime
                  }ms`,
                  r
                )
              }
            })
        }
        return res
      } catch (e: any) {
        consoleLog.error(e?.message || "Unknown error", e)
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
  cookieName?: DynamicOption<NextRequest, NextResponse, string>
  cookieDomain?: DynamicOption<NextRequest, NextResponse, string>
  extend?: DynamicOption<NextRequest, NextResponse, U>
  /**
   * If true, system next requests starting from /_next/ will be logged too, otherwise they are
   * all skipped
   */
  processSystemRequests?: boolean
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
  const collector = eventCollector(opts)
  return async (request, response) => {
    return await collector.nextApiHandler(request, response, opts)
  }
}

/**
 * @deprecated use collectEvents instead
 */
export const nextEventsCollectApi = collectApiHandler
