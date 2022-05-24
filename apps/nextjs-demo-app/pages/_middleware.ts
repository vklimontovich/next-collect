import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse } from "next/server"
import { collectEvents } from "next-collect/server"
import { nextCollectBasicSettings, parseUserCookie } from "../lib/next-collect-settings"

const middleware: NextMiddleware = (req: NextRequest, ev: NextFetchEvent) => {
  return NextResponse.next()
}

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  extend: (req: NextRequest) => {
    return {
      page: {
        name: req.page.name,
        params: req.page.params,
      },
      vercel: !!req.headers.get("x-vercel-id"),
      geo: {
        country: req.headers.get("x-vercel-ip-country"),
        region: req.headers.get("x-vercel-ip-country-region"),
        city: req.headers.get("x-vercel-ip-city"),
      },
      user: parseUserCookie(req.cookies["user"]),
    }
  },
})
