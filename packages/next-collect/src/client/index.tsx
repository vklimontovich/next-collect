"use client"
import React, { createContext, ReactNode, useContext } from "react"
import { AbsoluteUrlPath, DecomposedUrl, getQueryString, isDefaultPort, UrlProtocol } from "../isolibs/url"
import { AnalyticsInterface, createAnalytics } from "segment-protocol"
import { getUtmsFromQueryString } from "../isolibs/utm"
import { cookiePrefix, groupPersistKey, GroupProps, userPersistKey, UserProps } from "../isolibs/persist"
import { clearCookie, getCookie, setCookie } from "./cookie"

export const EventCollectionContext = createContext<CollectOptions | null>(null)

export interface CollectOptions {
  //Default is /api/collect. If you change it here, change it in next-collect.config.ts as well
  apiPath?: string

  /**
   * EXPERIMENTAL, use at your own risk
   *
   * What to do with incoming events
   *   allow - send them to the server
   *   deny - do not send them to the server
   *   queue (experimental) - queue them and send them to the server when switch to allow. Useful for cookie-banners
   */
  collectionPolicy?: "allow" | "deny" | "queue"
}

const defaultOptions: Required<CollectOptions> = {
  apiPath: "/api/ev",
  collectionPolicy: "allow",
}

export type NextCollectProviderOpts = {
  children: ReactNode
  options?: CollectOptions
}
export const NextCollectProvider: React.FC<NextCollectProviderOpts> = ({ children, options }) => {
  const Context = EventCollectionContext
  return <Context.Provider value={options || {}}>{children}</Context.Provider>
}

export type EventCollectionClient = {
  analytics: AnalyticsInterface
}

function getPublicUrl(): DecomposedUrl {
  const url = new URL(window.location.href)
  const protocol: UrlProtocol = url.protocol.split(":")[0] as UrlProtocol

  return {
    host: url.host.split(":")[0],
    path: url.pathname as AbsoluteUrlPath,
    port: isDefaultPort(protocol, url.port),
    protocol,
    queryString: [...url.searchParams].reduce((res, [key, value]) => ({ ...res, [key]: value }), {}),
  }
}

function removeUtmPrefix(key: string) {
  const prefix = "utm_"
  if (key.startsWith(prefix)) {
    return key.substring(prefix.length)
  }
  return key
}

function clear(key: string) {
  if (localStorage) {
    localStorage.removeItem(key)
  }
  clearCookie(`${cookiePrefix}${key}`)
}

function save(key: string, obj: any) {
  const serialized = JSON.stringify(obj)
  if (localStorage) {
    localStorage.setItem(key, serialized)
  }
  setCookie(`${cookiePrefix}${key}`, serialized)
}

function get<T = any>(key: string): T | undefined {
  if (localStorage) {
    const item = localStorage.getItem(key)
    try {
      return item ? JSON.parse(item) : undefined
    } catch (e) {
      console.log(`Error parsing item ${key} from local storage`, e)
    }
  }
  const cookieVal = getCookie(`${cookiePrefix}${key}`)
  if (cookieVal) {
    try {
      return JSON.parse(cookieVal)
    } catch (e) {
      console.log(`Error parsing item ${key} from cookie`, e)
    }
  }
}

//we should really put elsewhere. Does React allow to write into context?
const state: { group?: GroupProps; user?: UserProps } = {}

export function useCollect(): EventCollectionClient {
  const options = useContext(EventCollectionContext)

  if (options === null) {
    throw new Error(
      "useCollector() must be used within a EventCollectionProvider. Wrap a parent component in <EventCollectionProvider> to fix this error."
    )
  }

  const { apiPath } = {
    ...defaultOptions,
    ...options,
  }

  const analytics = createAnalytics({
    template: ({ type }) => {
      if (typeof window === "undefined") {
        throw new Error("useCollector() must be used on the client side")
      }
      const url = getPublicUrl()
      const utms = getUtmsFromQueryString(url.queryString)
      return {
        context: {
          page: {
            path: url.path,
            referrer: window.document.referrer,
            referring_domain: document.referrer.split("/")?.[2],
            host: url.host,
            search: getQueryString(url),
            url: window.location.href,
            title: window.document.title,
          },
          userAgent: window.navigator.userAgent,
          userAgentVendor: window.navigator.vendor,
          locale: window.navigator.language,
          library: {
            name: "next-collect",
            version: "0.0.0",
          },
          campaign: Object.entries(utms).reduce((res, [key, value]) => ({ ...res, [removeUtmPrefix(key)]: value }), {}),
          clientIds: {
            //todo - read client ids from cookies
          },
        },
      }
    },
    handler: async event => {
      console.log("Handling event", JSON.stringify(event, null, 2))
      if (event.type === "identify") {
        const userState = {
          userId: event.userId,
          traits: event.traits,
        } as const
        save(userPersistKey, userState)
        state.user = userState
      } else if (event.type === "group") {
        const groupState = {
          userId: event.userId,
          traits: event.traits,
        }
        save(groupPersistKey, groupState)
        state.group = groupState
      }

      if (!event.groupId && event.type !== "group") {
        event.groupId = state?.group?.groupId || get<GroupProps>(groupPersistKey)?.groupId
      }
      if (!event.userId && event.type !== "identify") {
        event.userId = state?.group?.groupId || get<GroupProps>(groupPersistKey)?.groupId
      }
      const res = await fetch(apiPath, { method: "POST", body: JSON.stringify(event) })
      if (!res.ok) {
        console.error(`Error sending payload to ${apiPath}`, res)
      }
    },
    handleReset: () => {
      state.group = undefined
      state.user = undefined
      clear(groupPersistKey)
      clear(userPersistKey)
    },
  })

  return { analytics }
}
