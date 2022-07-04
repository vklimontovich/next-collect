import { jitsuDriver } from "./drivers/jitsu"
import { createPrefixMap, PrefixMap } from "./tools"
import { segmentDriver } from "./drivers/segment"
import { postgrestDriver } from "./drivers/postgrest"
import { echoDriver } from "./drivers/echo"

export const nextCollectProtocolVersion = "1"

export type EventSinkDriverType = "jitsu" | "segment" | "custom" | "postgrest" | string

export const allDrivers: Record<EventSinkDriverType, EventSinkDriver> = {
  jitsu: jitsuDriver,
  segment: segmentDriver,
  postgrest: postgrestDriver,
  echo: echoDriver,
  custom(opts: { handler: EventHandler }, env: DriverEnvironment | undefined): EventHandler {
    return opts.handler
  },
}

export type EventSinkDriverOpts<O = any> = {
  type: EventSinkDriverType
  opts?: O
}

export type EventSinkContext = {
  fetch: typeof fetch
}

export type EventHandler<O = any> = {
  (event: PageEvent, ctx: EventSinkContext): Promise<any>
}

export type DriverEnvironment = { fetch: typeof fetch }

export type EventSinkDriver<O = any> = (opts: O, env?: DriverEnvironment) => EventHandler

export type Function<Args, Res> = ((a: Args) => Res) | Res

type EventTypeFunction = (route: string) => EventTypeResolution

const _defaultUserProps: Record<keyof Required<UserProperties>, any> = {
  anonymousId: true,
  id: true,
  email: true,
}

const defaultUserProps = Object.keys(_defaultUserProps)

export type UserProperties = {
  anonymousId?: string
  id?: string
  email?: string
}

export const knownUtmCodeNames = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
const knownUtmCodeSet = new Set(knownUtmCodeNames.map(m => m.toLowerCase()))

export type UtmCode = typeof knownUtmCodeNames[number] | `utm_${string}`

export const knownClickIdNames = ["gclid", "fbclid", "dclid"]
const knownClickIdNamesSet = new Set(knownClickIdNames.map(n => n.toLowerCase()))
export type ClickId = typeof knownClickIdNames[number]

export type UrlProtocol = "http" | "https"
export type AbsoluteUrlPath = `/${string}`
/**
 * Decomposed public url of request
 */
export type PublicUrl = {
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

export function getHostWithPort(url: PublicUrl) {
  return `${url.host}${url.port && ":" + url.port}`
}

const _defaultPageEventProps: Record<keyof Required<PageEventBase>, true> = {
  httpMethod: true,
  timestamp: true,
  clickIds: true,
  eventId: true,
  eventType: true,
  host: true,
  ipAddress: true,
  localTimezoneOffset: true,
  path: true,
  queryString: true,
  referrer: true,
  screenResolution: true,
  title: true,
  url: true,
  user: true,
  userAgent: true,
  userLanguage: true,
  utms: true,
  viewportSize: true,
}

export const defaultPageEventProps: Array<keyof PageEventBase> = Object.keys(_defaultPageEventProps) as Array<
  keyof PageEventBase
>

export type PageEventBase<U extends {} = {}> = {
  timestamp: Date
  eventId: string
  eventType: string
  ipAddress: string
  user: UserProperties & U
  userAgent?: string
  host: string
  path: string
  queryString?: string
  url: string
  httpMethod: string

  utms: Record<UtmCode, string>
  clickIds: Record<ClickId, string>

  referrer?: string
  userLanguage?: string
  title?: string

  localTimezoneOffset?: number
  screenResolution?: string
  viewportSize?: string
}

export type PageEvent<P extends {} = {}, U extends {} = {}> = PageEventBase<U> & P

export type EventTypeResolution = "$skip" | null | string

export type EventTypesMap =
  | Record<AbsoluteUrlPath, EventTypeResolution>
  | ([string, EventTypeResolution] | Record<string, EventTypeResolution>)[]

export type ArrayOrSingleton<T> = T | T[]

export type DriversList = ArrayOrSingleton<EventSinkDriverType | EventHandler | EventSinkDriverOpts | undefined | null>

export type CollectOpts = {
  drivers: DriversList
  eventTypes?: EventTypeFunction | EventTypesMap
  errorHandler?: (driverType: string, error: Error) => void
}

/**
 * @deprecated, keep for backward compatibility
 */
export type EventSinkOpts = CollectOpts

export function isDebug(): boolean {
  return !!process.env.NEXT_COLLECT_DEBUG
}

export function getUtmsFromQueryString(queryString: Record<string, string>): Record<UtmCode, string> {
  return Object.entries(queryString)
    .filter(([name]) => isUtmCode(name))
    .reduce((res, [name, val]) => ({ ...res, [name.toLowerCase() as UtmCode]: val }), {})
}

export function getClickIdsFromQueryString(queryString: Record<string, string>): Record<ClickId, string> {
  return Object.entries(queryString)
    .filter(([name]) => isClickId(name))
    .reduce((res, [name, val]) => ({ ...res, [name.toLowerCase() as ClickId]: val }), {})
}

export function parseDriverShortcut(drivers: DriversList): EventSinkDriverOpts[] {
  if (!drivers) {
    return []
  } else if (typeof drivers === "string") {
    return [{ type: drivers, opts: {} }]
  } else if (typeof drivers === "function") {
    return [{ type: "custom", opts: { handler: drivers } }]
  } else if (Array.isArray(drivers)) {
    return drivers
      .filter(driver => !!driver)
      .map(driver =>
        typeof driver === "string"
          ? { type: driver, opts: {} }
          : typeof driver === "function"
          ? { type: "custom", opts: { handler: driver } }
          : driver
      ) as EventSinkDriverOpts[]
  } else {
    throw new Error(`Invalid type ${typeof drivers}`)
  }
}

export function randomId() {
  return Math.random().toString(36).substring(2)
}

export function parseEventTypesMap(map: EventTypesMap | EventTypeFunction | undefined): EventTypeFunction {
  if (!map) {
    return () => "page_view"
  } else if (typeof map === "function") {
    return map
  } else if (Array.isArray(map)) {
    const prefixMap: PrefixMap<EventTypeResolution> = createPrefixMap(
      map.map(el => (Array.isArray(el) ? [el] : Object.entries(el))).flat(1)
    )
    return (route: string) => {
      return prefixMap.get(route) || null
    }
  } else if (typeof map === "object") {
    const prefixMap: PrefixMap<EventTypeResolution> = createPrefixMap(Object.entries(map))
    return (route: string) => {
      return prefixMap.get(route) || null
    }
  } else {
    throw new Error(`Wrong type ${typeof map}`)
  }
}

export function safeCall<T>(callable: () => T, message: string, defaultVal: T) {
  try {
    return callable()
  } catch (e) {
    console.error()
    return {}
  }
}

export function getEventHandler(opts: EventSinkDriverOpts): EventHandler {
  const driver = allDrivers[opts.type]
  if (!driver) {
    throw new Error(`Unknown driver ${opts.type}`)
  }
  return driver(opts.opts || {})
}

export function isDefaultPort(protocol: UrlProtocol, port?: string): string | undefined {
  return (protocol === "http" && port === "80") || (protocol === "https" && port === "443") ? undefined : port
}

export function isUtmCode(name: string): boolean {
  return knownUtmCodeSet.has(name.toLowerCase())
}

export function isClickId(name: string): boolean {
  return knownClickIdNamesSet.has(name.toLowerCase())
}

export function getFullUrl(url: PublicUrl) {
  return `${url.protocol}://${getHostWithPort(url)}${url.path}${getQueryString(url)}`
}

export function getQueryString(url: PublicUrl) {
  return Object.keys(url.queryString).length === 0
    ? ""
    : "?" +
        Object.entries(url.queryString)
          .map(([name, val]) => `${name}=${encodeURIComponent(val)}`)
          .join("&")
}

export const defaultCollectApiRoute = "/api/collect"

export type ClientSideCollectRequest = {
  event: Partial<PageEvent> & Record<keyof any, any>
}

export type ClientSideCollectResponse = {
  successful: boolean
}
