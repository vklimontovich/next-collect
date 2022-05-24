import { EventSinkDriver } from "../index"
import { ServerUrl } from "./jitsu"
import { flatten } from "../tools"

const styleTags = {
  underscore: "\x1b[4m",
  italic: "\u001b[3m",
  bold: "\x1b[1m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\u001b[90m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
}

const reset = "\x1b[0m"

type StyleType = keyof typeof styleTags

type StyleFunc = (str: string) => string

type ConsoleStyle = {
  [key in StyleType]: StyleFunc
}

const style = Object.entries(styleTags).reduce(
  (acc, [style, sequence]) => ({ ...acc, [style as StyleType]: (str: string) => `${sequence}${str}${reset}` }),
  {}
) as ConsoleStyle

export type EchoDriverOpts = {
  format: "json" | "table"
}

function toTable(event: Record<keyof any, any>) {
  const flat = flatten(event, { delimiter: "." })
  const maxKeyLen = Math.max(...Object.keys(flat).map(k => k.length))

  return Object.entries(flat)
    .map(([key, value], idx) => {
      const keyStr = key.padEnd(maxKeyLen)
      return `\t${(idx + 1).toString().padStart(3)}. ${style.bold(keyStr)} : ${value}`
    })
    .join("\n")
}

export const echoDriver: EventSinkDriver<EchoDriverOpts> = opts => {
  const format = opts?.format || "table"
  return (event, ctx) => {
    console.log(
      `${style.bold(style.green("[NextCollect:echo driver]"))} processing event ${style.bold(
        event.eventType || "uknown_event"
      )}\n` + (format === "json" ? JSON.stringify(event, null, 2) : toTable(event))
    )
    return Promise.resolve()
  }
}
