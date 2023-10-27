import type { AnalyticsServerEvent } from "segment-protocol"
import type { ServerRequest } from "../config"

/**
 * Server-side destination
 */
export type ServerDestination = {
  /**
   * Describe destination. Used in debug messages
   */
  describe(): string
  /**
   * Processes a single event
   * opts.event contains an enriched event (with IP address etc)
   * opts.req contains a server request object
   *
   * @param opts
   */
  on(opts: { event: AnalyticsServerEvent; req: ServerRequest }): Promise<void> | void
}

type BaseConfig = Record<string, any>

type KeysRequiredDefaults<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never
}[keyof T]

export type Defaults<T> = Required<Pick<T, KeysRequiredDefaults<T>>>

/**
 * Factory that creates destination
 * <T> - config type
 */
export type ServerDestinationFactory<T extends BaseConfig = BaseConfig> = {
  defaults: Defaults<T>
  create(config: Required<T>): ServerDestination
}
