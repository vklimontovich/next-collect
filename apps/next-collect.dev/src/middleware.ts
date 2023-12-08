import { nextCollectMiddleware } from "next-collect/server"

export const nextCollectConfig = { debugRoute: false }
export default nextCollectMiddleware(nextCollectConfig)
