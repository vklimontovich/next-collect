import { Defaults, ServerDestination, ServerDestinationFactory } from "./types"
import { AnalyticsServerEvent } from "segment-protocol"
import { ServerRequest } from "../config"
import { isDebug } from "../debug"
import { trimWriteKey } from "./util"

export type SegmentConfigTemplate = {
  writeKey: string
  apiBase?: string
}

function base64(str: string) {
  //should we use something else here?
  return btoa(str)
}

export function createSegmentLikeDestination<T extends SegmentConfigTemplate = SegmentConfigTemplate>({
  defaults,
  name,
  configFromEnv,
}: {
  defaults: Defaults<T>
  name: string
  configFromEnv: () => Partial<T>
}): ServerDestinationFactory<T> {
  return {
    defaults,
    create(_config): ServerDestination {
      const config = { ...defaults, ...configFromEnv(), ..._config }
      let apiBase = config.apiBase as string
      const writeKey = config.writeKey
      if (!writeKey) {
        throw new Error(
          `Missing writeKey for ${name} destination. It should be either set as env variable or passed as config`
        )
      }
      //trim last slashes
      while (apiBase.charAt(apiBase.length - 1) === "/") {
        apiBase = apiBase.substring(0, apiBase.length - 1)
      }
      //fix protocol if user forgot to add it
      if (apiBase.indexOf("http://") !== 0 && apiBase.indexOf("https://") !== 0) {
        apiBase = "https://" + apiBase
      }
      return {
        describe() {
          return `${name} @ ${config.apiBase} (key: ${trimWriteKey(config.writeKey)})`
        },
        async on(opts: { event: AnalyticsServerEvent; req: ServerRequest }): Promise<void> {
          const url = `${apiBase}/${opts.event.type}`
          const requestInit = {
            method: "POST",
            headers: {
              "Content-type": "application/json",
              Authorization: `Basic ${base64(`${writeKey}:`)}`,
            },
            body: JSON.stringify(opts.event),
          }
          let result
          try {
            result = await fetch(url, requestInit)
          } catch (e: any) {
            if (isDebug) {
              console.error(
                `Failed to send event to ${requestInit.method} ${url}: ${
                  e?.message || "unknown reason"
                }. Body: \n${JSON.stringify(opts.event, null, 2)}`,
                e
              )
            }
            throw new Error(
              `Failed to send event to ${requestInit.method} ${url}: ${e?.message || "unknown reason"}`,
              e
            )
          }

          if (!result.ok) {
            throw new Error(`Failed to send event to ${url}: ${result.status} ${await result.text()}`)
          }
          if (isDebug) {
            console.log(`Successfully sent event to ${url}: ${result.status} ${await result.text()}`)
          }
        },
      }
    },
  }
}
