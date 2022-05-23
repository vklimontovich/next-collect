import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { NextRequest } from "next/server"
import { nextCollectBasicSettings, parseUserCookie } from "../../lib/next-collect-settings"
import { nextEventsCollectApi } from "next-collect/server"

export default nextEventsCollectApi({
  ...nextCollectBasicSettings,
  extend: (req: NextApiRequest) => {
    return {
      onVercel: !!req.headers["x-vercel-id"],
      user: parseUserCookie(req.cookies["user"]),
      vercelGeo: {
        country: req.headers["x-vercel-ip-country"],
      },
    }
  },
})
