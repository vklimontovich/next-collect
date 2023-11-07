"use client"
import React from "react"
import { RouteLink } from "@/components/route-link"
import { useCollect } from "next-collect/client"

const SendEvent: React.FC<{}> = () => {
  const [clicked, setClicked] = React.useState(0)
  const { analytics } = useCollect()
  return (
    <>
      <button
        onClick={() => {
          analytics.track("click", {
            time: Date.now(),
          })
          setClicked(clicked + 1)
        }}
      >
        Send client side <code>click</code> event
      </button>
      {clicked > 0 && <>(clicked {clicked} times)</>}
    </>
  )
}

const Identify: React.FC<{}> = () => {
  const [uid, setUid] = React.useState("XYZ")
  const [email, setEmail] = React.useState("jane.doe@gmail.com")
  const [name, setName] = React.useState("Jane Doe")
  const { analytics } = useCollect()

  return (
    <>
      Identify myself as id=
      <input type="text" onChange={e => setUid(e.target.value)} value={uid} />, email=
      <input type="text" onChange={e => setUid(e.target.value)} value={email} /> and name=
      <input type="text" onChange={e => setUid(e.target.value)} value={name} />
      <button onClick={() => analytics.identify(uid, { email, name })}>Identify</button>
    </>
  )
}

export default function Home() {
  return (
    <main>
      <h2>This is a home page</h2>
      Here's what you can do
      <ul>
        <li>
          Go to <RouteLink>/subpage-1</RouteLink> or <RouteLink>/subpage-2?param=1</RouteLink> to see a new{" "}
          <code>page</code> event
        </li>
        <li>
          Open <RouteLink>/api/ev/debug?path=/page/url</RouteLink> to see an example of <code>page</code> event
        </li>
        <li>
          Open <RouteLink>/api/signup</RouteLink> to trigger a <code>signup</code> event
        </li>
        <li>
          Send event from client side: <SendEvent />
        </li>
        <li>
          Identify current user as <Identify />
        </li>
      </ul>
    </main>
  )
}
