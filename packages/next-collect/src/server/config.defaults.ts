//Utility type

import { NextCollectConfig } from "./config"

export type ConfigDefaults = Required<Pick<NextCollectConfig, "cookieName" | "apiRoute">>

export const nextConfigDefaults: ConfigDefaults = {
  cookieName: "nc_id",
  apiRoute: "/api/ev",
}
