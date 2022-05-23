import { EventSinkDriver } from "../index"
import { ServerUrl } from "./jitsu"

export type EchoDriverOpts = {}

export const echoDriver: EventSinkDriver<EchoDriverOpts> = opts => {
  return (event, ctx) => {
    console.log(
      `[next-collect - echo driver] processing event ${event.eventType || "uknown_event"}\n`,
      JSON.stringify(event, null, 2)
    )
    return Promise.resolve()
  }
}
