import { EventSinkOpts } from "next-collect"
import { NextMiddlewareOpts } from "next-collect/server"
import { NextRequest } from "next/server"

export const nextCollectBasicSettings: EventSinkOpts = {
  drivers: [
    process.env.JITSU_KEY && "jitsu",
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
