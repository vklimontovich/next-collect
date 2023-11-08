import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Section } from "@/components/section";
import { Button } from "@/components/button";

export default function Home({ params }: { params: { pathParam: string } }) {
  return (
    <main>
      <Section title={"Page view event"}>
        This page should send another page view event to destination.
        <div className="text-center mt-12">
          <Button href="/">Return to home</Button>
        </div>
      </Section>
    </main>
  )
}
