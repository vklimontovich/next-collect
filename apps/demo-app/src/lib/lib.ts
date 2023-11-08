export function isTruish(val?: string) {
  return (
    val &&
    (val.toLowerCase() === "true" ||
      val.toLowerCase() === "1" ||
      val.toLowerCase() === "yes" ||
      val.toLowerCase() === "on")
  )
}

export const nextCollectGithubURL = "https://github.com/jitsucom/next-collect"
