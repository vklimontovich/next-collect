export function trimWriteKey(writeKey: string) {
  let prefixSize = 3
  if (writeKey.length < 5) {
    return "***"
  } else if (writeKey.length < 8) {
    prefixSize = 1
  } else if (writeKey.length < 11) {
    prefixSize = 2
  }
  return `${writeKey.substring(0, prefixSize)}***${writeKey.substring(writeKey.length - prefixSize)}`
}
