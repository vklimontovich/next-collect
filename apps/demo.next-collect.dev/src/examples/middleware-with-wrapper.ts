import { NextCollectConfig, nextCollectMiddleware } from "next-collect/server"
import { NextMiddleware } from "next/server"

const middleware: NextMiddleware = async (req, res) => {}

export const nextCollectConfig: NextCollectConfig = {}

export default nextCollectMiddleware({ ...nextCollectConfig, middleware })
