import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse } from "next/server"
import { collectEvents } from "next-collect/server"
import { nextCollectOpts } from "./next-collect.config"

const middleware: NextMiddleware = (req: NextRequest, ev: NextFetchEvent) => {
  return NextResponse.next()
}

export default collectEvents({ middleware, ...nextCollectOpts })
