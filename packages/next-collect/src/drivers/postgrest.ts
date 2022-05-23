import { EventSinkContext, EventSinkDriver, PageEvent, PageEventBase } from "../index"
import { sanitizeObject, flatten } from "../tools"

export type PostgrestDriverOpts = {
  url?: string
  apiKey?: string
}

function getTableFromUrl(url: string): any {
  const parts = url
    .split("/")
    .map(el => el.trim())
    .filter(el => el && el !== "")
  return parts[parts.length - 1]
}

const defaultDataTypes: Record<keyof Required<PageEventBase>, string> = {
  clickIds: "TEXT",
  eventId: "TEXT",
  eventType: "TEXT",
  host: "TEXT",
  ipAddress: "TEXT",
  localTimezoneOffset: "INTEGER",
  path: "TEXT",
  queryString: "TEXT",
  referrer: "TEXT",
  screenResolution: "TEXT",
  title: "TEXT",
  url: "TEXT",
  user: "TEXT",
  userAgent: "TEXT",
  userLanguage: "TEXT",
  utms: "TEXT",
  viewportSize: "TEXT",
}

function guessDataType(field: string, value: string | boolean | number | null) {
  const defaultType = defaultDataTypes[field as keyof Required<PageEventBase>]
  if (defaultType) {
    return defaultType
  }
  if (typeof value === "string") {
    return "TEXT"
  } else if (typeof value === "boolean") {
    return "BOOLEAN"
  } else if (typeof value === "number") {
    return "DOUBLE PRECISION"
  } else {
    return "TEXT"
  }
}

function ddl(tableName: any, object: Record<string, string | boolean | number | null>) {
  const statements = Object.entries(object).map(
    ([field, value]) => `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${field}" ${guessDataType(field, value)}`
  )

  statements.push(`ALTER TABLE "${tableName}" ADD CONSTRAINT ${tableName.toLowerCase()}_pkey PRIMARY KEY ("eventId")`)
  return statements.join(";\n") + ";"
}

async function upsert(event: PageEvent, ctx: EventSinkContext, opts: PostgrestDriverOpts): Promise<any> {
  const flatVersion = flatten(event)
  const url = opts.url || process.env.POSTGREST_URL
  const apiKey = opts?.apiKey || process.env.POSTGREST_API_KEY
  if (!url) {
    throw new Error(`Please define opts.url or env.POSTGREST_URL`)
  }
  if (!apiKey) {
    throw new Error(`Please define opts.apiKey or env.POSTGREST_API_KEY`)
  }

  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "resolution=merge-duplicates",
  }
  const result = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(sanitizeObject(flatVersion)),
  })
  if (!result.ok) {
    throw new Error(
      `Failed to upsert data to ${url}. Code ${result.status} Error: ${await result.text()}. Payload ${JSON.stringify(
        flatVersion
      )}. Headers: ${JSON.stringify(
        headers
      )}.\n\nPlease make sure that schema is matching data by running this script:\n\n${ddl(
        getTableFromUrl(url),
        flatVersion
      )}`
    )
  }
}

export const postgrestDriver: EventSinkDriver<PostgrestDriverOpts> = opts => {
  return (event, ctx) => upsert(event, ctx, opts)
}
