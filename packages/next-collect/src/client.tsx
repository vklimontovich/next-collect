import React, { createContext, ReactNode, useContext } from "react"
import {
  AbsoluteUrlPath,
  ClientSideCollectRequest,
  defaultCollectApiRoute,
  PageEvent,
  PublicUrl,
  UrlProtocol,
  isDefaultPort,
  getHostWithPort,
  getQueryString,
  getUtmsFromQueryString,
} from "./index"
import { removeSuffix, sanitizeObject } from "./tools"
import { consoleLog } from "./log"

export const EventCollectionContext = createContext<CollectOptions | null>(null)

export interface CollectOptions {
  apiPath?: string
}

export const EventCollectionProvider: React.FC<{ children: ReactNode; options?: CollectOptions }> = ({
  children,
  options,
}) => {
  const Context = EventCollectionContext
  return <Context.Provider value={options || null}>{children}</Context.Provider>
}

export type EventCollectionClient = {
  event: (eventType: string, eventProps?: Partial<PageEvent> & { [key: string]: any }) => void
}

function getPublicUrl(): PublicUrl {
  const url = new URL(window.location.href)
  const protocol: UrlProtocol = removeSuffix(url.protocol, ":") as UrlProtocol

  return {
    host: url.host.split(":")[0],
    path: url.pathname as AbsoluteUrlPath,
    port: isDefaultPort(protocol, url.port),
    protocol,
    queryString: [...url.searchParams].reduce((res, [key, value]) => ({ ...res, [key]: value }), {}),
  }
}

export function useCollector(): EventCollectionClient {
  const options: CollectOptions | null = useContext(EventCollectionContext)

  return {
    event(eventType: string, eventProps: Partial<PageEvent> & { [p: string]: any } = {}): void {
      const url = getPublicUrl()
      const req: ClientSideCollectRequest = {
        event: {
          eventType,
          clickIds: getUtmsFromQueryString(url.queryString),
          host: getHostWithPort(url),
          path: url.path,
          title: window.document.title,
          viewportSize:
            Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) +
            "x" +
            Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
          screenResolution: screen.width + "x" + screen.height,
          queryString: getQueryString(url),
          referrer: window.document.referrer,
          localTimezoneOffset: new Date().getTimezoneOffset(),
          url: window.location.href,
          utms: getUtmsFromQueryString(url.queryString),
          ...eventProps,
        },
      }
      fetch(options?.apiPath || defaultCollectApiRoute, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(sanitizeObject(req)),
      })
        .then(async (res: Response) => {
          if (!res.ok) {
            consoleLog.warn(
              `Failed to send data to ${options?.apiPath || defaultCollectApiRoute}. Status code: ${res.status} `,
              await res.text()
            )
          }
        })
        .catch(e => {
          consoleLog.warn(`Failed to send data to ${options?.apiPath || defaultCollectApiRoute}`, e)
        })
    },
  }
}
