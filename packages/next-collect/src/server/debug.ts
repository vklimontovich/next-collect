export const isDebug =
  process.env.NEXT_COLLECT_DEBUG === "1" ||
  process.env.NEXT_COLLECT_DEBUG === "true" ||
  process.env.NEXT_COLLECT_DEBUG === "yes"
