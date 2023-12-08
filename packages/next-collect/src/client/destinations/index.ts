import { AnalyticsClientEvent } from "segment-protocol"
import { ga4Destination } from "./ga4"
import { gtmDestination } from "./gtm"

export type TagEventHandler = {
  on: (event: AnalyticsClientEvent) => void
}
export type TagDestination<T extends Record<string, any> = Record<string, any>> = {
  create: (opts: T) => TagEventHandler
}

export type TagSpecification<T extends Record<string, any> = Record<string, any>> = {
  type: string | TagDestination<T>
  opts?: T
}

export const tagDestinations: Record<string, TagDestination> = {
  "ga4": ga4Destination as any,
  "gtm": gtmDestination as any
}
