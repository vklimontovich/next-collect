import { nextCollectMiddleware } from "next-collect/server"

export const nextCollectConfig = { debugRoute: true }
export default nextCollectMiddleware(nextCollectConfig)
