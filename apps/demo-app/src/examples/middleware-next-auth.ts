import { getServerSession } from "next-auth"
import { NextCollectConfig, nextCollectMiddleware } from "next-collect/server"

export const nextCollectConfig: NextCollectConfig = {
  debugRoute: true,
  enrich: async (event, { nextRequest, nextResponse }, prev) => {
    prev(event)
    const session = await getServerSession()
    //@ts-expect-error
    event.userId = getUserIdFromSession(session)
  },
}

export default nextCollectMiddleware(nextCollectConfig)
