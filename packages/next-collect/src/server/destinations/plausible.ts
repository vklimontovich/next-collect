import { ServerDestination, ServerDestinationFactory } from "./types"
import { AnalyticsServerEvent } from "segment-protocol"
import { ServerRequest } from "../config"
import { trimWriteKey } from "./util"
import { isDebug } from "../debug"

export type PlausibleConfig = {
  plausibleDomain: string
}

export const plausible: ServerDestinationFactory<PlausibleConfig> = {
  defaults: {},
  create(config: PlausibleConfig): ServerDestination {
    const plausibleDomain = config.plausibleDomain || process.env.PLAUSIBLE_DOMAIN
    if (!plausibleDomain) {
      throw new Error(
        `Missing Plausible domain. It should be either set as env variable PLAUSIBLE_DOMAIN or passed as config`
      )
    }
    return {
      async on({ event, req }): Promise<void> {
        if (event.type === "identify" || event.type === "group" || event.type === "alias") {
          return
        }
        const url = `https://plausible.io/api/event`
        const body = {
          domain: config.plausibleDomain,
          name: event.type === "page" ? "pageview" : event.name || event.type,
          url: event.context.page?.url,
          referer: event.context.page?.referrer,
          props: event.properties,
          revenue: event.properties?.revenue,
        }
        const headers = {
          "Content-type": "application/json",
          "X-Forwarded-For": event.context.ip || event.context.requestIp || "127.1.1.1",
          "User-Agent": event.context.userAgent || "",
        }
        const requestInit = {
          method: "POST",
          headers: headers,
          body: JSON.stringify(body),
        }
        let result
        try {
          result = await fetch(url, requestInit)
        } catch (e: any) {
          if (isDebug) {
            console.error(
              `Failed to send event to ${requestInit.method} ${url}: ${
                e?.message || "unknown reason"
              }. Body: \n${JSON.stringify(event, null, 2)}`,
              e
            )
          }
          throw new Error(`Failed to send event to ${requestInit.method} ${url}: ${e?.message || "unknown reason"}`, e)
        }

        if (!result.ok) {
          throw new Error(`Failed to send event to ${url}: ${result.status} ${await result.text()}`)
        }
        if (isDebug) {
          console.log(
            `Successfully sent event to ${url}: ${result.status} ${await result.text()}:\n${JSON.stringify(
              {
                body,
                headers,
              },
              null,
              2
            )}`
          )
        }
      },
      describe(): string {
        return `Plausible @ ${config.plausibleDomain}`
      },
    }
  },
}
