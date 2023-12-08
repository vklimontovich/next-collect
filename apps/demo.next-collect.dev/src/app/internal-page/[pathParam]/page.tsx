"use client"
import Image from "next/image"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { Section } from "@/components/section"
import { Button } from "@/components/button"

export default function Home({ params }: { params: { pathParam: string } }) {
  const pathname = usePathname()
  return (
    <main>
      <Section title={"Page view event"}>
        This page should send another page view event to destination.{" "}
        <Link href={`${pathname}?a=1`}>Load same page with different parameter</Link>
        <div className="text-center mt-12">
          <Button href="/">Return to home</Button>
        </div>
      </Section>
    </main>
  )
}
