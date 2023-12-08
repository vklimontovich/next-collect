import { TagDestination } from "./index"

import initializeGTM from "./gtm-inititializer";

export type GoogleTagManagerContainerId = `GTM-${string}`

export type GoogleTagDestinationCredentials = {
  debug?: boolean
  containerId: GoogleTagManagerContainerId
  dataLayerName?: string
  preview?: string
  auth?: string
  customScriptSrc?: string
}

export function validateContainerId(containerId: string): GoogleTagManagerContainerId {
  if (containerId.indexOf("GTM-") === 0) {
    return containerId as GoogleTagManagerContainerId
  }
  throw new Error(`To be valid, Google Tag containerId must start with 'GTM-'. Got: ${containerId}`)
}


type GoogleTagState = "fresh" | "loading" | "loaded" | "failed"

function getGoogleTagState(id: string): GoogleTagState {
  return (window as any)[`__jitsuGtmState_${id}`] || "fresh"
}

function setGtmState(id: string, s: GoogleTagState) {
  ;(window as any)[`__jitsuGtmState_${id}`] = s
}

export const gtmDestination: TagDestination<GoogleTagDestinationCredentials> = {
  create: (opts: GoogleTagDestinationCredentials) => {
    const dataLayerName = opts.dataLayerName || "dataLayer"
    const tagId = `${dataLayerName}_${opts.containerId}`
    if (opts.debug) {
      console.log(`Initializing GTM Destination, state=${getGoogleTagState(tagId)}`, opts)
    }

    validateContainerId(opts.containerId)
    const dataLayer = initializeGTM(opts.containerId, { dataLayerName })

    return {
      on: payload => {
        if (opts.debug) {
          console.log("GTM event", payload)
        }
        const gtag = (window as any)["gtag"]
        if (!gtag) {
          console.warn("gtag() function is not defined. Something went wrong with google tag initialization")
        }
        if (!dataLayer) {
          console.warn(
            `dataLayer (var - ${dataLayer}) is not defined. Something went wrong with google tag initialization`
          )
        }

        const props = payload.properties || {}
        switch (payload.type) {
          case "page":
            const gtmPageView = {
              event: "pageview",
              ...props,
              ...(payload.userId ? { user_id: payload.userId } : {}),
            }
            dataLayer.push(gtmPageView)
            if (opts.debug) {
              console.log(`${dataLayerName}.push(${JSON.stringify(gtmPageView)})`)
            }
            break
          case "track":
            const eventName = payload.event || "track"
            const gtmEvent = {
              event: eventName,
              ...props,
              ...(payload.userId ? { user_id: payload.userId } : {}),
            }
            dataLayer.push(gtmEvent)
            if (opts.debug) {
              console.log(`${dataLayerName}.push(${JSON.stringify(gtmEvent)})`)
            }

            break
          case "group":
            const gtmGroupEvent = {
              ...(payload.userId ? { user_id: payload.userId } : {}),
              ...(payload.traits || {}),
            }
            dataLayer.push(gtmGroupEvent)
            if (opts.debug) {
              console.log(`${dataLayerName}.push(${JSON.stringify(gtmGroupEvent)})`)
            }
            break
          case "identify":
            const gtmIdentifyEvent = {
              ...(payload.userId ? { user_id: payload.userId } : {}),
              ...(payload.traits || {}),
            }
            dataLayer.push(gtmIdentifyEvent)
            if (opts.debug) {
              console.log(`${dataLayerName}.push(${JSON.stringify(gtmIdentifyEvent)})`)
            }
            break
        }
      },
    }
  },
}
