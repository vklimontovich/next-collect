import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse } from "next/server"
import { collectEvents } from "next-collect/server"
import { nextCollectBasicSettings, parseUserCookie } from "../lib/next-collect-settings"

const middleware: NextMiddleware = (req: NextRequest, ev: NextFetchEvent) => {
  console.log("Wrapped page middleware is executed on " + req.nextUrl.pathname)
  return NextResponse.next()
}

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  extend: (req: NextRequest) => {
    return {
      onVercel: !!req.headers.get("x-vercel-id"),
      user: parseUserCookie(req.cookies["user"]),
      vercelGeo: {
        country: req.headers.get("x-vercel-ip-country"),
      },
    }
  },
})
