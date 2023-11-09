"use client"
import React, { PropsWithChildren, ReactNode } from "react"
import { RouteLink } from "@/components/route-link"
import { useCollect } from "next-collect/client"
import Link from "next/link"
import { Button } from "@/components/button"
import { Section } from "@/components/section"
import { nextCollectGithubURL } from "@/lib/lib"
const SendEvent: React.FC<{}> = () => {
  const [clicked, setClicked] = React.useState(0)
  const { analytics } = useCollect()
  return (
    <div className="flex justify-between items-center">
      <div className="text-zinc-600">The event has been sent {clicked} times</div>
      <Button
        onClick={() => {
          analytics.track("click", {
            time: Date.now(),
          })
          setClicked(clicked + 1)
        }}
      >
        Send event
      </Button>
    </div>
  )
}

const FormField: React.FC<{ value: string; title: ReactNode; onChange: (val: string) => void }> = ({
  value,
  title,
  onChange,
}) => {
  return (
    <div className="flex flex-row items-center">
      <label className="text-sm text-zinc-800 font-semibold w-36">{title}</label>
      <input
        className="border border-zinc-200 focus:border-zinc-600 hover:border-zinc-600 rounded-md px-2 py-1 text-zinc-700 text-sm outline-0"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

const Identify: React.FC<{}> = () => {
  const [uid, setUid] = React.useState("XYZ")
  const [email, setEmail] = React.useState("jane.doe@gmail.com")
  const [name, setName] = React.useState("Jane Doe")
  const [userTraits, setUserTraits] = React.useState<any>()
  const { analytics } = useCollect()

  return (
    <Section
      title="Identify user"
      footer={
        <div className="flex justify-between">
          <div>
            User: <code>{userTraits ? JSON.stringify(userTraits) : "unknown"}</code>
          </div>
          <Button
            onClick={() => {
              analytics.identify(uid, { email, name })
              setUserTraits({ userId: uid, traits: { email, name } })
            }}
          >
            Identify
          </Button>
        </div>
      }
    >
      Fill the information about the user below and click Identify to record this info. The user id and properties will
      be saved in local storage, so subsequent events will be sent with this information.
      <div className="flex flex-col gap-4 mt-4">
        <FormField value={uid} title="User Id" onChange={setUid} key="userId" />
        <FormField value={email} title="User Email" onChange={setEmail} key="userEmail" />
        <FormField value={name} title="User Name" onChange={setName} key="userName" />
      </div>
    </Section>
  )
}

export default function Home() {
  return (
    <main className="flex flex-col gap-12 ">
      <div className="text-l">
        This page demonstrates most of the features of <code>next-collect</code>. Read library documentation{" "}
        <Link href={nextCollectGithubURL}>on GitHub</Link>
      </div>
      <Section title="Page view">
        Page view events are sent automatically by <code>middleware.ts</code>. Once page loads, you should see a new
        event in coming to destination. Go to <RouteLink>/internal-page/page1</RouteLink> or{" "}
        <RouteLink>/internal-page/page2</RouteLink> to see a new <code>page</code> event coming to destination.
      </Section>
      <Section title="Event structure">
        To see how event is represented by JSON, <RouteLink>/api/ev/debug?path=/page/url</RouteLink>. Install{" "}
        <Link href="https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa">
          JSON Formatter
        </Link>{" "}
        extension to see it in a more readable way.
      </Section>
      <Section title="Client side event" footer={<SendEvent />}>
        Click on a button below to send a <code>click</code> event from client side.
      </Section>
      <Identify />
    </main>
  )
}
