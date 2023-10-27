import { Defaults, ServerDestination, ServerDestinationFactory } from "./types"
import { AnalyticsServerEvent } from "segment-protocol"
import { ServerRequest } from "../config"

export type SegmentConfigTemplate = {
  writeKey: string
  apiBase?: string
}

function trimWriteKey(writeKey: string) {
  let prefixSize = 3
  if (writeKey.length < 5) {
    return "***"
  } else if (writeKey.length < 8) {
    prefixSize = 1
  } else if (writeKey.length < 11) {
    prefixSize = 2
  }
  return `${writeKey.substring(0, prefixSize)}***${writeKey.substring(writeKey.length - prefixSize)}`
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
      if (apiBase.indexOf("http://") != 0 || apiBase.indexOf("https://")) {
        apiBase = "https://" + apiBase
      }
      return {
        describe() {
          return `${name} @ ${config.apiBase} (key: ${trimWriteKey})`
        },
        async on(opts: { event: AnalyticsServerEvent; req: ServerRequest }): Promise<void> {
          const url = `${apiBase}/${opts.event.type}`
          let requestInit = {
            method: "POST",
            headers: {
              "Content-type": "application/json",
              Authorization: `Basic ${base64(`${writeKey}:`)}`,
            },
            body: JSON.stringify(opts.event),
          }
          const result = await fetch(url, requestInit)
          if (!result.ok) {
            throw new Error(`Failed to send event to ${name}: ${result.status} ${await result.text()}`)
          }
        },
      }
    },
  }
}
