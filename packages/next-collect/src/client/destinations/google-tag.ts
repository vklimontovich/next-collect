import { TagDestination } from "./index"
import { loadScript } from "../load-script"

export type GoogleTagDestinationCredentials = {
  debug?: boolean
  containerId: string
  dataLayerName?: string
  preview?: string
  auth?: string
  customScriptSrc?: string
}

const defaultScriptSrc = "https://www.googletagmanager.com/gtag/js"

type GtmState = "fresh" | "loading" | "loaded" | "failed"

function getGtmState(id: string): GtmState {
  return (window as any)[`__jitsuGtmState_${id}`] || "fresh"
}

function setGtmState(id: string, s: GtmState) {
  ;(window as any)[`__jitsuGtmState_${id}`] = s
}

export const googleTag: TagDestination<GoogleTagDestinationCredentials> = {
  create: (opts: GoogleTagDestinationCredentials) => {
    const dataLayerName = opts.dataLayerName || "dataLayer"
    const tagId = `${dataLayerName}_${opts.containerId}`
    if (opts.debug) {
      console.log(`Initializing Google Tag Destination, state=${getGtmState(tagId)}`, opts)
    }
    if (getGtmState(tagId) === "fresh") {
      const win = window as any
      const loadParams = new URLSearchParams()
      win[dataLayerName] = win[dataLayerName] || []
      const gtag = (win["gtag"] = function () {
        win[dataLayerName].push(arguments)
      } as any)
      loadParams.set("id", opts.containerId)
      if (opts.dataLayerName) {
        loadParams.set("dl", opts.dataLayerName)
      }
      gtag("js", new Date())
      gtag("config", opts.containerId, { send_page_view: false })
      const scriptSrc = `${opts.customScriptSrc || defaultScriptSrc}?${loadParams.toString()}`
      setGtmState(tagId, "loading")
      if (opts.debug) {
        console.log(`Loading google tag from ${scriptSrc}`, opts)
      }
      loadScript(scriptSrc)
        .then(() => {
          setGtmState(tagId, "loaded")
        })
        .catch(e => {
          console.warn(`Google Tag (containerId=${opts.containerId}) init failed: ${e.message}`, e)
          setGtmState(tagId, "failed")
        })
    }

    return {
      on: payload => {
        if (opts.debug) {
          console.log("Google Tag Destination event", payload)
        }
        const gtag = (window as any)["gtag"]
        if (!gtag) {
          console.warn("gtag() function is not defined. Something went wrong with google tag initialization")
        }
        const dataLayer = (window as any)[dataLayerName]
        if (!dataLayer) {
          console.warn(
            `dataLayer (var - ${dataLayer}) is not defined. Something went wrong with google tag initialization`
          )
        }

        const props = payload.properties || {};
        switch (payload.type) {
          case "page":
            gtag("event", "page_view", props)
            if (opts.debug) {
              console.log(`gtag('event', 'page_view', ${JSON.stringify(props)})`);
            }
            break
          case "track":
            const eventName = payload.event || 'track';
            gtag("event", eventName, props)
            if (opts.debug) {
              console.log(`gtag('event', 'eventName', ${JSON.stringify(props)})`);
            }
            break
          case "group":
            const groupTraits = {
              ...(payload.userId ? { user_id: payload.userId } : {}),
              ...(payload.traits || {}),
            };
            gtag("config", opts.containerId, groupTraits)
            if (opts.debug) {
              console.log(`gtag('config', '${opts.containerId}', ${JSON.stringify(props)})`);
            }
            break;
          case "identify":
            const traits = {
              ...(payload.userId ? { user_id: payload.userId } : {}),
              ...(payload.traits || {}),
            };
            gtag("config", opts.containerId, traits)
              if (opts.debug) {
                console.log(`gtag('config', '${opts.containerId}', ${JSON.stringify(props)})`);
              }
            break
        }
      },
    }
  },
}
