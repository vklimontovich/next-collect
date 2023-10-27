import { NextCollectConfig, nextCollectMiddleware } from "next-collect/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export const nextCollectConfig: NextCollectConfig = {
  debugRoute: true,
  enrich: async (event, { nextRequest, nextResponse }, prev) => {
    prev(event)
    const supabase = createMiddlewareClient({ req: nextRequest, res: nextResponse })
    const session = await supabase.auth.getSession()
    event.userId = session.data?.session?.user?.id
  },
}
export default nextCollectMiddleware(nextCollectConfig)
