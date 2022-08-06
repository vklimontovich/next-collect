import { splitObject, removeProps, mapKeys } from "../tools"
import { defaultPageEventProps, DriverEnvironment, EventSinkDriver, isDebug, PageEvent, UtmCode } from "../index"
import { getUserAgent } from "../version"
import { remoteCall } from "../remote"

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

const segmentBatchEndpoint = "https://api.segment.io/v1/batch"

async function sinkServerEvent(
  _event: PageEvent,
  { fetch, log }: DriverEnvironment,
  opts: SegmentDriverOpts
): Promise<any> {
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
  const [baseEvent, extra] = splitObject(_event, defaultPageEventProps)
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

  const payload = { batch, context }
  remoteCall(segmentBatchEndpoint, {
    debug: isDebug(),
    method: "POST",
    headers: {
      Authorization: `Basic ${segmentKey}`,
      "User-Agent": getUserAgent(),
    },
    payload,
  })
    .then(response => {
      if (isDebug()) {
        log.log(
          `Successfully sent event to ${segmentBatchEndpoint}: ${JSON.stringify(payload)}. Response: ${JSON.stringify(
            response
          )}`
        )
      }
    })
    .catch(e => {
      log.warn(`Failed to send data to ${segmentBatchEndpoint}`, e)
    })
}
