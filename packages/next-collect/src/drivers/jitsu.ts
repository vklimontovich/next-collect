import { splitObject, removeSuffix, renameProps, sanitizeObject } from "../tools"
import { defaultPageEventProps, DriverEnvironment, EventSinkDriver, PageEvent } from "../index"

export type ServerUrl = `${"http" | "https"}://${string}`
export type JitsuDriverOpts = {
  key?: string
  server?: ServerUrl
}

export const jitsuDriver: EventSinkDriver<JitsuDriverOpts> = opts => {
  return (event, ctx) => sinkServerEvent(event, ctx, opts)
}

async function sinkServerEvent(_event: PageEvent, { fetch }: DriverEnvironment, opts: JitsuDriverOpts): Promise<any> {
  const jitsuKey = opts.key || process.env.JITSU_KEY
  if (!jitsuKey) {
    throw new Error(`Jitsu driver is mis-configured. Either opts.key option, or JITSU_KEY env car should be defined`)
  }
  const [event, extra] = splitObject(_event, defaultPageEventProps)

  const jitsuUrl = `${removeSuffix(
    opts?.server || process.env.JITSU_SERVER || "https://t.jitsu.com",
    "/"
  )}/api/v1/s2s/event`
  const jitsuRequest = {
    event_type: event.eventType,
    screen_resolution: event.screenResolution,
    user_agent: event.userAgent,
    referer: event.referrer,
    url: event.url,
    page_title: event.title,
    doc_path: event.path,
    doc_host: event.host,
    doc_search: event.queryString,
    vp_size: event.viewportSize,
    user_language: event.userLanguage,
    source_ip: event.ipAddress,
    user: renameProps(event.user, { anonymousId: "anonymous_id" }),
    ids: {},
    local_tz_offset: event.localTimezoneOffset,
    utm: event.utms,
    click_id: event.clickIds,
    ...extra,
  }
  fetch(jitsuUrl, {
    method: "POST",
    headers: {
      "X-Auth-Token": jitsuKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(sanitizeObject(jitsuRequest)),
  })
    .then(async res => {
      if (!res.ok) {
        console.warn(`[WARN] failed to send data to ${jitsuUrl}. Status: ${res.status}: ${await res.text()}`)
      }
    })
    .catch(e => {
      console.warn(`[WARN] failed to send data to ${jitsuUrl}`, e)
    })
}
