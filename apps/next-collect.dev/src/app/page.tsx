import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Github } from "lucide-react"
import { Installer } from "@/components/ui/installer"
import React, { ReactNode } from "react"

import amplitudeIcon from "@/components/ui/icons/amplitude"
import mixpanelIcon from "@/components/ui/icons/mixpanel"
import juneIcon from "@/components/ui/icons/june"
import posthogIcon from "@/components/ui/icons/posthog"
import gtmIcon from "@/components/ui/icons/gtm"
import gaIcon from "@/components/ui/icons/ga4"
import segmentIcon from "@/components/ui/icons/segment"
import rudderstack from "@/components/ui/icons/rudderstack"
import plausibleIcon from "@/components/ui/icons/plausible"
import jitsuIcon from "@/components/ui/icons/jitsu"

import JitsuLogo from "@/components/ui/icons/jitsuFull"
import CalcomLogo from "@/components/ui/icons/calcom"
import { cn } from "@/lib/utils"
import Link from "next/link"

const Integration: React.FC<{ children?: ReactNode; logo: ReactNode; href?: string; comingSoon?: boolean }> = ({
  children,
  logo,
  href,
  comingSoon,
}) => {
  const content = (
    <>
      <div
        className={`p-4 rounded border border-neutral-200 bg-white w-96 $${
          href && "cursor-pointer hover:scale-[1.02] transform duration-300"
        } ${comingSoon && "opacity-[0.60]"}`}
      >
        <div className="flex items-center">
          <div className="rounded-full mr-2 object-contain h-8 w-8">{logo}</div>
          <span className="whitespace-nowrap">{children}</span>
        </div>
      </div>
    </>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

const UsingLogo: React.FC<{ children?: ReactNode; className?: string; href: string }> = ({
  children,
  className,
  href,
}) => {
  return (
    <Link href={href}>
      <div className={cn("h-8 grayscale opacity-60", className)} style={{ objectFit: "contain" }}>
        {children}
      </div>
    </Link>
  )
}

export default function Homepage() {
  return (
    <section className="flex flex-col items-center justify-start min-h-screen p-4 space-y-8 text-center">
      <div className="flex flex-col items-center space-y-4 mt-12 md:mt-48">
        <Image
          alt="NextCollect Logo"
          className="object-contain rounded-full"
          height="80"
          src="/next-collect-logo.svg"
          width="80"
        />
        <h1 className="text-5xl font-bold text-gray-800 ">NextCollect</h1>
      </div>
      <p className="max-w-lg mx-auto text-neutral-600 text-2xl">
        The easiest way to add analytics to your Next.js app. Powered by middleware.
      </p>
      <Installer className="w-96" />
      <div className="flex space-x-4">
        <Button intent="secondary" href="https://github.com/vklimontovich/next-collect#readme">
          View Documentation
        </Button>
        <Button
          intent="primary"
          icon={<Github className="h-full w-full" />}
          href="https://github.com/vklimontovich/next-collect"
        >
          Go to Github
        </Button>
      </div>
      <section className="w-full max-w-5xl mx-auto space-y-6 pt-16 md:pt-24">
        <h2 className="text-3xl font-bold text-gray-800">Supported Integrations</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Integration key="jitsu" logo={jitsuIcon} href="https://github.com/vklimontovich/next-collect#readme">
            Jitsu
          </Integration>
          <Integration key="segment" logo={segmentIcon} href="https://github.com/vklimontovich/next-collect#readme">
            Segment
          </Integration>
          <Integration key="plausible" logo={plausibleIcon} href="https://github.com/vklimontovich/next-collect#readme">
            Plausible
          </Integration>
          <Integration key="gtm" logo={gtmIcon} href="https://github.com/vklimontovich/next-collect#readme">
            Google Tag Manager
          </Integration>
          <Integration key="ga4" logo={gaIcon} href="https://github.com/vklimontovich/next-collect#readme">
            Google Analytics 4
          </Integration>
        </div>
      </section>
      <section className="w-full max-w-5xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Coming Soon</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Integration key="mixpanel" logo={mixpanelIcon} comingSoon={true}>
            Mixpanel
          </Integration>
          <Integration key="amplitude" logo={amplitudeIcon} comingSoon={true}>
            Amplitude
          </Integration>
          <Integration key="june" logo={juneIcon} comingSoon={true}>
            June.so
          </Integration>
          <Integration key="ph" logo={posthogIcon} comingSoon={true}>
            Posthog
          </Integration>
          <Integration key="rs" logo={rudderstack} comingSoon={true}>
            Rudderstack
          </Integration>
        </div>
      </section>
      <section className="w-full max-w-5xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-gray-800 mt-12 mb-12">Who's using NextCollect?</h2>
        <div className="flex justify-evenly">
          <UsingLogo href="https://jitsu.com">
            <JitsuLogo />{" "}
          </UsingLogo>
          <UsingLogo key="cal" href="https://cal.com">
            <CalcomLogo />{" "}
          </UsingLogo>
        </div>
      </section>
      <div className="text-xs text-center pt-12">
        Made with ❤️ by{" "}
        <Link className="underline decoration-dotted" href="https://klmn.sh">
          Vladimir Klimontovich
        </Link>
        . Supported by{" "}
        <Link className="underline decoration-dotted" href="https://jitsu.com">
          Jitsu
        </Link>
      </div>
    </section>
  )
}
