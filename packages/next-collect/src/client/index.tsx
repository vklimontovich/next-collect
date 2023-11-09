"use client"
import React, { createContext, PropsWithChildren, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AbsoluteUrlPath, DecomposedUrl, isDefaultPort, UrlProtocol } from "../isolibs/url"
import {
  AnalyticsClientEvent,
  AnalyticsInterface,
  createAnalytics,
  inferAnalyticsContextFields,
} from "segment-protocol"
import { cookiePrefix, groupPersistKey, GroupProps, userPersistKey, UserProps } from "../isolibs/persist"
import { clearCookie, getCookie, setCookie } from "./cookie"
import { useParams, usePathname } from "next/navigation"
import { tagDestinations, TagEventHandler, TagSpecification } from "./destinations"
import { randomId } from "../isolibs/lib"
export const EventCollectionContext = createContext<(CollectOptions & { tags?: TagEventHandler[] }) | null>(null)

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
  tags?: TagSpecification[]
}

const AppRouterPageViewListener: React.FC<PropsWithChildren<{ onRouteChange: () => void }>> = ({
  onRouteChange,
  children,
}) => {
  const pathname = usePathname()
  const params = useParams()
  useEffect(() => {
    onRouteChange()
  }, [pathname, params])
  return <>{children}</>
}

function getAnonymousId() {
  //we should expose nc_id to a configuration at some point
  //user can change a cookie name on server side, it should be possible here to
  let anonymousId = getCookie('nc_id');
  if (!anonymousId) {
    console.log(`Can't find nc_id cookie, generating a new one: ` + window.document.cookie)
    anonymousId = randomId();
    setCookie(`nc_id`, anonymousId);
  }
  return anonymousId;
}

export const NextCollectProvider: React.FC<NextCollectProviderOpts> = ({ children, options, tags }) => {
  const Context = EventCollectionContext
  const [initializedTags, setInitializedTags] = useState<TagEventHandler[] | undefined>(undefined)

  const latestValue = useRef(initializedTags);

  useEffect(() => {
    if (tags) {
      const tagHandlers: TagEventHandler[] = tags
        .map(tag => {
          const tagDestination = typeof tag.type === "string" ? tagDestinations[tag.type] : tag.type
          if (!tagDestination) {
            console.warn("Unknown tag type", tag.type)
            return undefined
          }
          try {
            return tagDestination.create(tag.opts || {})
          } catch (e) {
            console.warn("Error initializing tag", e)
          }
        })
        .filter(Boolean) as TagEventHandler[]
      setInitializedTags(tagHandlers)
      latestValue.current = tagHandlers;
    }
  }, [])
  const onRouteChange = useCallback(() => {
    if (latestValue.current) {
      if (typeof window === "undefined") {
        throw new Error("useCollector() must be used on the client side. Window is not defined");
      }
      const event: AnalyticsClientEvent = {
        messageId: randomId(),
        type: "page",
        context: inferAnalyticsContextFields(createAnalyticsContext(window)),
        anonymousId: getAnonymousId(),
        groupId: get<GroupProps>(groupPersistKey)?.groupId,
        userId: get<UserProps>(userPersistKey)?.userId,
      }
      latestValue.current.forEach(tag => {
        try {
          tag.on(event)
        } catch (e) {
          console.warn("Error sending event to tag", event, e)
        }
      })
    }
  }, [initializedTags]);
  return (
    <AppRouterPageViewListener onRouteChange={onRouteChange}>
      <Context.Provider value={{ ...(options || {}), tags: initializedTags }}>{children}</Context.Provider>
    </AppRouterPageViewListener>
  )
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
      console.warn(`Error parsing item ${key} from local storage`, e)
    }
  }
  const cookieVal = getCookie(`${cookiePrefix}${key}`)
  if (cookieVal) {
    try {
      return JSON.parse(cookieVal)
    } catch (e) {
      console.warn(`Error parsing item ${key} from cookie`, e)
    }
  }
}

//we should really put elsewhere. Does React allow to write into context?
const state: { group?: GroupProps; user?: UserProps } = {}

function createAnalyticsContext(window: any) {
  return {
    page: {
      referrer: window.document.referrer,
      url: window.location.href,
      title: window.document.title,
    },
    userAgent: window.navigator.userAgent,
    userAgentVendor: window.navigator.vendor,
    locale: window.navigator.language,
    encoding: window.document.characterSet,
    library: {
      name: "next-collect",
      version: "0.0.0",
    },
    clientIds: {
      //todo - read client ids from cookies
    },
  }
}

export function useCollect(): EventCollectionClient {
  const options = useContext(EventCollectionContext)

  if (options === null) {
    throw new Error(
      "useCollector() must be used within a EventCollectionProvider. Wrap a parent component in <EventCollectionProvider> to fix this error."
    )
  }
  const tags = options.tags

  const { apiPath } = {
    ...defaultOptions,
    ...options,
  }

  const analytics = createAnalytics({
    template: ({ type }) => {
      if (typeof window === "undefined") {
        throw new Error("useCollector() must be used on the client side")
      }
      return {
        context: inferAnalyticsContextFields(createAnalyticsContext(window)),
      }
    },
    handler: async event => {
      if (tags) {
        tags.forEach(tag => {
          try {
            tag.on(event)
          } catch (e) {
            console.warn("Error sending event to tag", event, e)
          }
        })
      }
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
