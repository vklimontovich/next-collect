export type UtmCode = (typeof knownUtmCodeNames)[number] | `utm_${string}`
export type ClickId = (typeof knownClickIdNames)[number]

export const knownUtmCodeNames = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
export const knownClickIdNames = ["gclid", "fbclid", "dclid"]
const knownUtmCodeSet = new Set(knownUtmCodeNames.map(m => m.toLowerCase()))
const knownClickIdNamesSet = new Set(knownClickIdNames.map(n => n.toLowerCase()))

export function isUtmCode(name: string): boolean {
  return knownUtmCodeSet.has(name.toLowerCase())
}

export function isClickId(name: string): boolean {
  return knownClickIdNamesSet.has(name.toLowerCase())
}

export function getUtmsFromQueryString(queryString: Record<string, string>): Record<UtmCode, string> {
  return Object.entries(queryString)
    .filter(([name]) => isUtmCode(name))
    .reduce((res, [name, val]) => ({ ...res, [name.toLowerCase() as UtmCode]: val }), {})
}

export function getClickIdsFromQueryString(queryString: Record<string, string>): Record<ClickId, string> {
  return Object.entries(queryString)
    .filter(([name]) => isClickId(name))
    .reduce((res, [name, val]) => ({ ...res, [name.toLowerCase() as ClickId]: val }), {})
}
