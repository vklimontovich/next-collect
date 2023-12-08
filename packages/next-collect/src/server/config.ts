import type { NextApiRequest, NextApiResponse } from "next"
import type { NextRequest, NextResponse } from "next/server"
import type { AnalyticsServerEvent, EventType } from "segment-protocol"
import { DecomposedUrl } from "../isolibs/url"
import { ServerDestinationFactory } from "./destinations"

/**
 * Definition of server destination. Can be:
 *  `undefined` - convinient for disabling destination as in process.env.DEST_CONFIG && ...
 *  `string` - name of the prefab destination
 *  `{type: string, opts: any}` - destination with type and options
 *  `{type: function, opts: any}` - custom destination with options
 */
export type ServerDestinationLike = undefined | string | { type: string | ServerDestinationFactory; config: any }

type NextRequest_Api = {
  apiRequest: NextApiRequest
  nextRequest?: never
}

type NextRequest_Default = {
  apiRequest?: never
  nextRequest: NextRequest
}

type NextResponse_Default = {
  apiResponse?: never
  nextResponse: NextResponse
}

type NextResponse_Api = {
  apiResponse: NextApiResponse
  nextResponse?: never
}

export type RequestType = NextApiRequest | NextRequest | undefined

/**
 * Next.js has two types of requests: API requests and HTTP requests.
 *
 * NextApiRequest is used in API Routes, NextRequest is used in pages and middleware,
 * and app router.
 *
 * This type is used to represent either of them.
 */
export type NextRequestUnion<T extends RequestType = undefined> = T extends NextApiRequest
  ? NextRequest_Api
  : T extends NextRequest
    ? NextRequest_Default
    : NextRequest_Default | NextRequest_Api

/**
 * Server request - NextApiRequest or NextRequest with most common properties
 * of request
 */
export type ServerRequest<T extends RequestType = NextRequest> = NextRequestUnion<T> & {
  /**
   * Relative path of request, e.g. `/api/foo`,
   */
  path: string

  /**
   * If request is a prefetch request
   */
  isPrefetch: boolean

  /**
   * If request starts with /_next/
   */
  isNextInternal: boolean

  /**
   * If request is api call - starts with /api
   */
  isApi: boolean

  /**
   * If request is a request to a static resource, such as favicon, image, css file
   * Q: is it ever true? Does Next.js sends static requests to the middleware?
   */
  isStatic: boolean

  /**
   * Simplified header reader. If header has a few values, they will be joined with comma.
   */
  header: (s: string) => string | undefined
  /**
   * Read cookie by name
   * @param s
   */
  getCookie(s: string): string | undefined
  /**
   * Returns a query parameter by name. If there are a few parameters with the same name, it will make a comma-separated
   * string
   * @param s
   */
  q(s: string): string | undefined

  /**
   * Public URL where request was made. E.g. https://myapp.com/api/foo?param=1
   */
  externalUrl: {
    url: string
    decomposed: DecomposedUrl
  }
  /**
   * Public ip address of a request
   */
  ip?: string
}

export type ServerRequestContext<T extends RequestType = NextRequest> = ServerRequest<T> &
  (T extends NextRequest ? NextResponse_Default : T extends NextApiRequest ? NextResponse_Api : never) & {
    setCookie: (name: string, val: string, opts: { cookieDomain: string }) => void
    clearCookie: (name: string) => void
  }

export type EventHydrationFunction = (
  event: AnalyticsServerEvent,
  req: ServerRequestContext,
  prev: (event: AnalyticsServerEvent) => Promise<void> | void
) => Promise<void> | void

export type EventFilterFunction = (req: ServerRequest) => EventType | string | false | null | undefined
/**
 * Server side configuration of next-collect
 */
export type NextCollectConfig = {
  /**
   * EXPERIMENTAL! If true, next-collect will process events asynchronously. That means that it will not wait until all destination
   * will return a definitive result. Instead, it will return 200 OK immediately and process events in background. Depending
   * on runtime and event volumes, some events may be lost.
   *
   * Most likely, no events will be lost on Vercel's high traffic deploys (> few page views per second)
   */
  async?: boolean
  /**
   * Next collect requires an API route that will accept events. `/api/ev` by default (see nextConfigDefaults.apiRoute)
   */
  apiRoute?: string

  /**
   * Debug route. If to true, next-collect will expost a debug route on ${apiRoute}/debug
   */
  debugRoute?: boolean

  /**
   * Name of the cookie that will be used to store anonymous id. `nc_a_id` by default (see nextConfigDefaults.cookieName)
   */
  cookieName?: string
  /**
   * Domain of the cookie. By default, that's going to be the top-leve domain of your app
   *
   * E.g. if domain is subdomain.myapp.com, cookie domain will be .myapp.com. If domain is myapp.com, cookie domain
   * will be .myapp.com
   *
   * Jitsu recognized certain domains as "shared". For example, if your app is deployed to myapp.herokuapp.com,
   * then cookie domain will be  myapp.herokuapp.com (NOT .herokuapp.com). Other shared domains are *.vercel.app,
   * *.now.sh, *.netlify.app, *.render.com, *.fly.dev, *.fly.io, *.cloudflare.com, *.co.uk etc.
   *
   * However, the list might be not full. So if your app can be deployed on any of those domains, it's better to
   * set it explicitly
   */
  cookieDomain?: string
  /**
   * List of destinations where events should be sent
   */
  destinations?: ServerDestinationLike[]

  /**
   * Function to filter requests. If it returns false | null | undefined, request is ignored. If it returns string,
   * that string is used as event type.
   *
   * If it returns EventType, that event type is used. For arbitrary string it will be translated to .track() event
   * with that name.
   * @param req
   */
  filter?: EventFilterFunction

  /**
   * 'Hydration' function to change the event before it was sent to destination. Examples of changes:
   *  - Add user id based on cookie or http header
   *  - Add custom properties like environment, app version, etc
   */
  hydrate?: EventHydrationFunction
}
