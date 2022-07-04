import { CollectOpts } from "next-collect"
import { NextApiHandlerOpts, NextMiddlewareOpts } from "next-collect/server"
import { NextRequest } from "next/server"
import { NextApiRequest } from "next"
import { NextCollectOpts } from "next-collect/server"

export const nextCollectOpts: NextCollectOpts = {
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
  extend: (req: NextRequest | NextApiRequest) => {
    if (req instanceof NextRequest) {
      return {
        vercel: !!req.headers.get("x-vercel-id"),
        geo: {
          country: req.headers.get("x-vercel-ip-country"),
          region: req.headers.get("x-vercel-ip-country-region"),
          city: req.headers.get("x-vercel-ip-city"),
        },
        user: parseUserCookie(req.cookies.get("user")),
      }
    } else {
      return {
        onVercel: !!req.headers["x-vercel-id"],
        user: parseUserCookie(req.cookies["user"]),
        vercelGeo: {
          country: req.headers["x-vercel-ip-country"],
        },
      }
    }
  },
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
