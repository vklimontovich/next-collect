import { ID, JSONObject } from "segment-protocol"

export type UserProps = {
  userId?: ID
  traits?: JSONObject
}

export type GroupProps = {
  groupId?: string
  traits?: JSONObject
}

//Persistent keys for group and user props.
//Used as-is for localStorage and with cookiePrefix for cookies
export const groupPersistKey = "next-collect-gruid"
export const userPersistKey = "next-collect-uid"
export const cookiePrefix = `nc_`

export function encodeCookie<T extends string | undefined = string | undefined>(val: T): T {
  return (val ? encodeURIComponent(val as string) : undefined) as T
}

export function decodeCookie<T = string | undefined>(val: T): T {
  return (val ? decodeURIComponent(val as string) : undefined) as T
}
