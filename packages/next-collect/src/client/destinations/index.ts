import { AnalyticsClientEvent } from "segment-protocol"
import { googleTag } from "./google-tag"

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
  "google-tag": googleTag as any,
}
