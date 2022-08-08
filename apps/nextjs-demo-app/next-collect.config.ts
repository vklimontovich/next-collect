import { NextCollectOpts } from "next-collect/server"
import { NextRequest } from "next/server"
import { NextApiRequest } from "next"
import { getCookie, getHeader, getAllHeaders } from "next-collect/server"

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
  processSystemRequests: true,
  eventTypes: [
    { "/api/collect": null },
    { "/api*": "api_call" },
    { "/img*": null },
    { "/favicon*": null },
    { "/*": "page_view" },
  ],
  extend: (req: NextRequest | NextApiRequest) => {
    return {
      allHeaders: JSON.stringify(getAllHeaders(req)),
      envVars: JSON.stringify(
        Object.entries(process.env)
          .sort(([name1], [name2]) => name1.localeCompare(name2))
          .reduce((acc, [name, val]) => ({ ...acc, [name]: val }), {})
      ),
      nextRuntime: process.env.NEXT_RUNTIME,
      onVercel: !!getHeader(req, "x-vercel-id"),
      vercelGeo: {
        country: getHeader(req, "x-vercel-ip-country"),
        region: getHeader(req, "x-vercel-ip-country-region"),
        city: getHeader(req, "x-vercel-ip-city"),
      },
      user: parseUserCookie(getCookie(req, "user")),
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
