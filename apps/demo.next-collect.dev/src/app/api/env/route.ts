// src/pages/api/sign-up.ts
import { NextRequest, NextResponse, userAgent } from "next/server"
import { nextCollect } from "next-collect/server"
import { nextCollectConfig } from "@/middleware"
import { isTruish } from "@/lib/lib"

function getUserId(req: NextRequest) {
  return req.nextUrl.searchParams.get("userId") || "sampleUserId"
}

function getUserProps(req: NextRequest): { email: string; name: string } {
  return {
    email: req.nextUrl.searchParams.get("email") || "john.doe@gmail.com",
    name: req.nextUrl.searchParams.get("name") || "John Doe",
  }
}

function sortByKey(dict: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(dict).sort(([a], [b]) => a.localeCompare(b)))
}

export async function GET(req: NextRequest, res: NextResponse) {
  const disableDebugInfo = !isTruish(process.env.ENABLE_DEBUG_PAGES)

  return NextResponse.json({
    env: disableDebugInfo ? undefined : sortByKey(process.env),
    headers: disableDebugInfo ? undefined : sortByKey(Object.fromEntries(req.headers.entries())),
    cookies: sortByKey(Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]))),
    nodeVersion: process.versions.node,
    geo: req.geo,
    userAgent: req.headers.get("user-agent"),
    userAgentInfo: userAgent(req),
  })
}
