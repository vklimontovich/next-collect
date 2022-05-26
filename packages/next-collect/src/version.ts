export function getVersion(): string {
  return "canary"
}

export function getUserAgent() {
  return `next-collect : github.com/jitsucom/next-collect : version=${getVersion()} bot=true`
}
