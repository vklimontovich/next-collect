import { decodeCookie } from "../isolibs/persist"

export function getCookie(name: string) {
  const value = `; ${document.cookie}`
  return decodeCookie(value.split(`; ${name}=`)?.[2])
}

//at some point we should support setting cookie on a primare domain,
//as server does
export function setCookie(
  name: string,
  val: string,
  { domain, secure, daysValid = 365 }: { domain?: string; secure?: boolean; daysValid?: number } = {}
) {
  if (secure === undefined) {
    secure = window.location.href.startsWith("https://")
  }
  document.cookie =
    name +
    "=" +
    val +
    (domain ? ";domain=" + domain : "") +
    ";path=/" +
    ";expires=" +
    new Date(new Date().getTime() + daysValid * 24 * 60 * 60 * 1000).toUTCString() +
    ";SameSite=" +
    (secure ? "None" : "Lax") +
    (secure ? ";secure" : "")
}

export function clearCookie(name: string) {
  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/"
}
