type LogFunction = (msg?: string, ...args: any[]) => void
export type NextCollectLog = {
  debug: LogFunction
  info: LogFunction
  //alias of info
  log: LogFunction
  warn: LogFunction
  error: LogFunction
}

function log(delegate: any, level: string, component: string | undefined, msg: string | undefined, args: any[]) {
  if (!msg) {
    delegate("")
    return
  }
  const timestamp = new Date().toISOString().replace("T", " ").replace("Z", "") + " UTC"
  const levelPadded = `[${level.toUpperCase()}]`.padEnd(5)
  const consoleMsg = `${timestamp} ${levelPadded}${component ? ` (${component}) ` : ""}- ${msg}`
  if (args.length > 0) {
    delegate(consoleMsg, ...args)
  } else {
    delegate(consoleMsg)
  }
}

export const consoleLog = getLog(`next-collect/${typeof window === "undefined" ? "server" : "client"}`)

export type ComponentName = (() => string | undefined) | string | undefined

function getComponentName(name?: ComponentName): string | undefined {
  return typeof name === "function" ? name() : name
}

export function getLog(componentName?: ComponentName): NextCollectLog {
  const partial = {
    error(msg?: string, ...args: any[]): void {
      log(console.error, "error", getComponentName(componentName), msg, args)
    },
    warn(msg?: string, ...args: any[]): void {
      log(console.warn, "warn", getComponentName(componentName), msg, args)
    },
    info(msg?: string, ...args: any[]): void {
      log(console.info, "info", getComponentName(componentName), msg, args)
    },
    debug(msg?: string, ...args: any[]): void {
      log(console.info, "debug", getComponentName(componentName), msg, args)
    },
  }
  return { log: partial.info, ...partial }
}
