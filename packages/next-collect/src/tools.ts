export function removeSuffix(str: string, suffix: string | string[]): string {
  const suffixes = typeof suffix === "string" ? [suffix] : suffix
  for (const suff of suffixes) {
    while (str.lastIndexOf(suff) === str.length - suff.length) {
      str = str.substring(0, str.length - suff.length)
    }
  }
  return str
}

export type SanitizeOjectOpts = {
  //What to do with undefined values? remove (default) - remove them, toNull - conver to nulls
  undefs?: "remove" | "toNull"
  removeFunctions?: false
}

/**
 * Removes all undefined values from object tree
 */
export function sanitizeObject(object: any, opts: SanitizeOjectOpts = {}): any {
  const { undefs = "remove", removeFunctions = false } = opts
  if (object === null) {
    throw new Error(`sanitizeObject(null) can't be called`)
  }
  if (typeof object !== "object") {
    throw new Error(`Wrong type ${typeof object} - expected object`)
  }

  if (Array.isArray(object)) {
    return (undefs === "remove" ? object.filter(element => element !== undefined) : object).map(element => {
      if (element === undefined) {
        return null
      } else if (typeof element === "object") {
        return sanitizeObject(element, opts)
      } else {
        return element
      }
    })
  }

  return (
    undefs === "remove" ? Object.entries(object).filter(([, value]) => value !== undefined) : Object.entries(object)
  ).reduce((res, [key, value]) => {
    if (value === undefined || value === null) {
      return { ...res, [key]: null }
    } else if (typeof value === "object") {
      return { ...res, [key]: sanitizeObject(value, opts) }
    } else {
      return { ...res, [key]: value }
    }
  }, {})
}

export function renameProps(obj: any, rename: Record<keyof any, keyof any>) {
  return Object.entries(obj).reduce((res, [key, value]) => ({ ...res, [rename[key] || key]: value }), {})
}

export function removeProps<T extends keyof any = string>(
  obj: Record<keyof any, any>,
  ...props: T[]
): Record<keyof any, any> {
  const propSet = new Set<T>(props)
  return Object.entries(obj)
    .filter(([key]) => propSet.has(key as T))
    .reduce((res, [key, value]) => ({ ...res, [key]: value }), {} as Record<T, any>)
}

export type PrefixMap<T> = {
  get(element: string): T | undefined
}

export function createPrefixMap<T>(map: [string, T][]): PrefixMap<T> {
  const prefixes: [string, T][] = []
  const suffixes: [string, T][] = []
  const fullUrls: Map<string, T> = new Map<string, T>()
  for (const [key, val] of map) {
    const firstWildcard = key.indexOf("*")
    const lastWildcard = key.lastIndexOf("*")
    if (firstWildcard < 0 && lastWildcard < 0) {
      fullUrls.set(key, val)
    } else if (firstWildcard >= 0 && lastWildcard >= 0 && firstWildcard !== lastWildcard) {
      throw new Error(
        `Invalid pattern ${key}. So far we support only one wildcard that should be at the end or beginning of url. Found at least two wildcards`
      )
    } else if (firstWildcard === key.length - 1) {
      prefixes.push([key.substring(0, key.length - 1), val])
    } else if (firstWildcard === 0) {
      suffixes.push([key.substring(1), val])
    } else {
      throw new Error(
        `Invalid pattern ${key}. So far we support only one wildcard that should be at the end or beginning of url. Found at least two wildcards`
      )
    }
  }
  return {
    get(element: string) {
      const fullMatch = fullUrls.get(element)
      if (fullMatch !== undefined) {
        return fullMatch
      }
      const prefixMatch = prefixes.find(([key]) => element.startsWith(key))
      if (prefixMatch && prefixMatch[1] === null) {
        return prefixMatch[1]
      }
      const suffixMatch = suffixes.find(([key]) => element.endsWith(key))
      if (suffixMatch && suffixMatch[1] === null) {
        return suffixMatch[1]
      }
      return (prefixMatch || suffixMatch || [undefined, undefined])[1]
    },
  }
}

export function isObject(object: any) {
  return object && typeof object === "object" && !Array.isArray(object)
}

export function deepSet(obj: any, _path: (keyof any)[], val: any) {
  const path = [..._path]
  if (path.length === 1) {
    obj[path[0]] = val
    return
  }
  const key = path.shift() as string
  if (obj[key] === undefined) {
    obj[key] = {}
  }
  deepSet(obj[key], path, val)
}

export function deepDelete(obj: any, path: (keyof any)[]) {
  if (path.length === 1) {
    delete obj[path[0]]
    return
  }
  const key = path.shift() as string
  if (obj[key] !== undefined) {
    deepDelete(obj[key], path)
  }
}

export function deepGet(obj: any, _path: (keyof any)[]): any {
  const path = [..._path]
  if (path.length === 1) {
    return obj[path[0]]
  }
  const key = path.shift() as string
  if (obj[key] === undefined) {
    return undefined
  }
  return deepGet(obj[key], path)
}

export function deepClone(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone)
  }
  return Object.entries(obj).reduce((res, [key, val]) => ({ ...res, [key]: deepClone(val) }), {})
}

export function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v]
}

export function splitObject<T, P extends keyof T>(obj: T, props: (P | (keyof any)[])[]): [Pick<T, P>, Omit<T, P>] {
  const base: Partial<T> = {}
  const extra = deepClone(obj)
  const paths = props.map(prop => (Array.isArray(prop) ? prop : [prop]))
  for (const path of paths) {
    const val = deepGet(obj, path)
    deepSet(base, path, val)
    deepDelete(extra, path)
  }
  return [base as Pick<T, P>, extra]
}

export function deepMerge(
  target: Record<keyof any, any>,
  ...sources: Record<keyof any, any>[]
): Record<keyof any, any> {
  if (!sources.length) {
    return target
  }

  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} })
        }
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return deepMerge(target, ...sources)
}

export function mapKeys<K extends keyof any, N extends keyof any, V>(obj: Record<K, V>, f: (k: K) => N): Record<N, V> {
  return Object.entries(obj)
    .map(([key, val]) => [f(key as K), val])
    .reduce((res, [key, val]) => ({ ...res, [key as N]: val }), {}) as Record<N, V>
}

export function flatten(
  data: Record<keyof any, any>,
  opts?: { delimiter?: string; stopPaths?: (string | string[])[] }
): Record<string, string | boolean | number | null> {
  return Object.entries(data).reduce((res, [key, value]) => {
    if ((opts?.stopPaths || []).find(path => path === key || (path.length === 1 && path[0] === key))) {
      return { ...res, [key]: value }
    }

    if (value === undefined || value === null) {
      return { ...res, [key]: null }
    } else if (Array.isArray(value)) {
      return { ...res, [key]: JSON.stringify(value) }
    } else if (typeof value === "object") {
      const flatChild = mapKeys(
        flatten(value, {
          ...opts,
          stopPaths:
            opts?.stopPaths &&
            opts?.stopPaths.filter(path => Array.isArray(path) && path.length > 1).map(path => path.slice(1)),
        }),
        k => `${key}${opts?.delimiter || "_"}${k}`
      )
      return { ...res, ...flatChild }
    } else {
      return { ...res, [key]: value }
    }
  }, {})
}
