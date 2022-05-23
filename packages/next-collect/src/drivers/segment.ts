import { splitObject, removeSuffix, renameProps, sanitizeObject, removeProps, mapKeys } from "../tools"
import { defaultPageEventProps, DriverEnvironment, EventSinkDriver, getQueryString, PageEvent, UtmCode } from "../index"

export type SegmentDriverOpts = {
  key?: string
  disableIdentify?: boolean
}

export const segmentDriver: EventSinkDriver<SegmentDriverOpts> = opts => {
  return (event, ctx) => sinkServerEvent(event, ctx, opts)
}

function toSegmentCampaign(utms: Record<UtmCode, string>) {
  return mapKeys(utms, utm => {
    const index = utm.indexOf("utm_")
    return index === 0 ? utm.substring("utm_".length) : utm
  })
}

async function sinkServerEvent(_event: PageEvent, { fetch }: DriverEnvironment, opts: SegmentDriverOpts): Promise<any> {
  const segmentKey = opts.key || process.env.SEGMENT_KEY
  if (!segmentKey) {
    throw new Error(`Segment driver is misconfigured. Either opts.key option, or SEGMENT_KEY env car should be present`)
  }
  const batch = []

  const nowIso = new Date().toISOString()
  const context = {
    ip: _event.ipAddress,
    campaign: toSegmentCampaign(_event.utms || {}),
    locale: _event.userLanguage,
    page: {
      referrer: _event.referrer,
      search: _event.queryString,
      userAgent: _event.userAgent,
    },
    library: {
      name: "nextjs-collect",
    },
  }
  if (!opts?.disableIdentify && (_event.user?.id || _event.user?.anonymousId)) {
    batch.push({
      type: "identify",
      anonymousId: _event.user?.anonymousId,
      userId: _event.user?.id,
      traits: removeProps(_event.user || {}, "anonymousId", "userId"),
      timestamp: nowIso,
    })
  }
  const [baseEvent, extra] = splitObject(_event, ...defaultPageEventProps)
  if (baseEvent.eventType === "page_view") {
    batch.push({
      type: "page",
      anonymousId: _event.user?.anonymousId,
      userId: _event.user?.id,
      name: _event.title || _event.path,
      context,
      properties: extra,
    })
  } else {
    batch.push({
      type: "track",
      event: baseEvent.eventType,
      anonymousId: _event.user?.anonymousId,
      userId: _event.user?.id,
      context,
      properties: extra,
    })
  }
  const segmentTrackRequest = {
    anonymousId: _event.user?.anonymousId,
    userId: _event.user?.id,
    context,
    traits: removeProps(_event.user || {}, "anonymousId", "userId"),
  }

  fetch("https://api.segment.io/v1/batch", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(segmentKey)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      batch,
      context,
    }),
  })
    .then(async res => {
      if (!res.ok) {
        console.warn(
          `[WARN] failed to send data to https://api.segment.io/v1/batch. Status: ${res.status}: ${await res.text()}`
        )
      }
    })
    .catch(e => {
      console.warn(`[WARN] failed to send data to https://api.segment.io/v1/batch`, e)
    })
}

function segmentCall(url: string, key: string, payload: any) {
  fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(key + ":")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(sanitizeObject(payload)),
  })
    .then(async res => {
      if (!res.ok) {
        console.warn(`[WARN] failed to send data to ${url}. Status: ${res.status}: ${await res.text()}`)
      }
    })
    .catch(e => {
      console.warn(`[WARN] failed to send data to ${url}`, e)
    })
}
