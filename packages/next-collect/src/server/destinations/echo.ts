import { ServerDestinationFactory } from "./types"

let globalEventCounter = 0

export const echoDestination: ServerDestinationFactory = {
  defaults: {},
  create() {
    return {
      describe() {
        return "Echo"
      },
      on({ event }) {
        console.log(`Event ${globalEventCounter++} received\n`, JSON.stringify(event, null, 2))
      },
    }
  },
}
