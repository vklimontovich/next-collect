const express = require("express")
import { remoteCall } from "../src/remote"
const fetch = require("node-fetch-commonjs")

export type CurrentServer = {
  server: any
  port: number
}

let currentServer: CurrentServer | null = null

function startServer(): Promise<CurrentServer> {
  const app = express()
  app.get("/delay", (req: any, res: any) => {
    setTimeout(() => {
      res.send({ ok: true })
    }, parseInt(req.query.delay as string))
  })
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const serverAddress = server.address()
      if (typeof serverAddress === "string" || serverAddress === null) {
        reject(new Error(`Failed to get server address from: ${serverAddress}`))
      } else {
        console.log(`Server listening on port: ${serverAddress.port}`)
        resolve({ server, port: serverAddress.port })
      }
    })
  })
}

beforeEach(async () => {
  currentServer = await startServer()
})

afterEach(() => {
  if (currentServer) {
    currentServer.server.close()
  }
})

/**
 * @jest-environment jsdom
 */
test("remoteCall", async () => {
  const result = await remoteCall(`http://localhost:${currentServer?.port}/delay?delay=100`, { fetch: fetch as any })
  expect(result).toEqual({ ok: true })
  await expect(async () => {
    await remoteCall(`http://localhost:${currentServer?.port}/delay?delay=1000`, {
      fetch: fetch as any,
      timeoutMs: 500,
    })
  }).rejects.toThrowError(/timeouts/)
})
