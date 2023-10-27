// src/pages/api/sign-up.ts
import { NextRequest, NextResponse } from "next/server"
import { nextCollect } from "next-collect/server"
import { nextCollectConfig } from "@/middleware"

function getUserId(req: NextRequest) {
  return req.nextUrl.searchParams.get("userId") || "sampleUserId"
}

function getUserProps(req: NextRequest): { email: string; name: string } {
  return {
    email: req.nextUrl.searchParams.get("email") || "john.doe@gmail.com",
    name: req.nextUrl.searchParams.get("name") || "John Doe",
  }
}

export async function GET(req: NextRequest, res: NextResponse) {
  const { analytics } = nextCollect(req, res, nextCollectConfig)
  const userId = getUserId(req)
  const { email, name } = getUserProps(req)
  const identifyEvent = await analytics.identify(userId, { email, name })
  const signupEvent = await analytics.track("Sign Up", { email, name })
  return NextResponse.json({ events: { signup: signupEvent, identify: identifyEvent } })
}
