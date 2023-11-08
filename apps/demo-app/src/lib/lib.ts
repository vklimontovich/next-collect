export function isTruish(val?: string) {
  return (
    val &&
    (val.toLowerCase() === "true" ||
      val.toLowerCase() === "1" ||
      val.toLowerCase() === "yes" ||
      val.toLowerCase() === "on")
  )
}
