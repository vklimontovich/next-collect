import { createSegmentLikeDestination } from "./segment-template"
import { echoDestination } from "./echo"
import { ServerDestinationFactory } from "./types"
import { ServerDestinationLike } from "../config"

export const coreDestinations: Record<string, ServerDestinationFactory> = {
  segment: createSegmentLikeDestination({
    defaults: { apiBase: "https://api.segment.io/v1" },
    name: "Segment",
    configFromEnv: () => ({
      apiBase: process.env.SEGMENT_API_BASE,
      writeKey: process.env.SEGMENT_WRITE_KEY,
    }),
  }),
  jitsu: createSegmentLikeDestination({
    defaults: { apiBase: "https://api.segment.io/v1" },
    name: "Jitsu",
    configFromEnv: () => ({
      apiBase: process.env.JITSU_API_BASE,
      writeKey: process.env.JITSU_WRITE_KEY,
    }),
  }),
  rudder: createSegmentLikeDestination({
    defaults: { apiBase: "https://api.segment.io/v1" },
    name: "RudderStack",
    configFromEnv: () => ({
      apiBase: process.env.RUDDER_STACK_API_BASE,
      writeKey: process.env.RUDDER_STACK_WRITE_KEY,
    }),
  }),
  echo: echoDestination,
} as const

function isTruish(envVar?: string) {
  return envVar && (envVar.toLowerCase() === "1" || envVar === "true" || envVar.toLowerCase() === "yes")
}

/**
 * List of destinations that are self-configurable, meaning they check if env variables are set and if so, they
 * configure themselves automatically
 */
export const selfConfigurableDestinations = [
  process.env.SEGMENT_WRITE_KEY && "segment",
  process.env.JITSU_API_BASE && process.env.JITSU_WRITE_KEY && "jitsu",
  process.env.RUDDER_STACK_API_BASE && process.env.RUDDER_STACK_WRITE_KEY && "rudder",
  isTruish(process.env.NEXT_COLLECT_ECHO) && "echo",
] as ServerDestinationLike[]

export * from "./types"
