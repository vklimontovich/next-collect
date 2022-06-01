import { EventSinkOpts } from "next-collect"

export const nextCollectBasicSettings: EventSinkOpts = {
  drivers: [
    process.env.JITSU_KEY && "jitsu",
    process.env.POSTGREST_URL && {
      type: "postgrest",
      opts: { extraColumns: ["vercel", "geo", ["page", "name"]] },
    },
    process.env.SEGMENT_KEY && "segment",
    {
      type: "echo",
      opts: {
        format: "table",
        disableColor: true,
      },
    },
  ],
  eventTypes: [
    { "/api/collect-api": null },
    { "/api*": "api_call" },
    { "/img*": null },
    { "/favicon*": null },
    { "/*": "page_view" },
  ],
}

export function parseUserCookie(cookie?: string): {
  id?: string
  email?: string
} {
  if (!cookie) {
    return {}
  } else {
    return JSON.parse(atob(cookie))
  }
}
