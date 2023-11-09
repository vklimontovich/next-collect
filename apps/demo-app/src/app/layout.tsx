import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NextCollectProvider } from "next-collect/client"
import Link from "next/link"
import { NextCollectLogo } from "@/components/logo"
import { GithubLogo } from "@/components/github-logo"
import { nextCollectGithubURL } from "@/lib/lib"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "next-collect demo",
  description: "next-collect demo",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="w-screen h-screen flex flex-col">
          <header className="border-b border-zinc-200 px-4 py-6 flex items-center justify-between">
            <Link className="flex flex-nowrap items-center no-underline text-zinc-900" href="/">
              <div className="h-12 w-12">
                <NextCollectLogo />
              </div>
              <span className="font-bold text-lg ml-2">NextCollect</span>
              <span className="ml-2 italic mb-2">(Demo)</span>
            </Link>
            <div>
              <Link href={nextCollectGithubURL} className="block hover:opacity-50 w-8 h-8 text-red-400">
                <GithubLogo />
              </Link>
            </div>
          </header>
          <section className="bg-zinc-50 grow">
            <div className="max-w-4xl mx-auto p-12">
              <NextCollectProvider
                debug={true}
                tags={
                  process.env.NEXT_PUBLIC_GOOGLE_TAG
                    ? [{ type: "google-tag", opts: { debug: true, containerId: process.env.NEXT_PUBLIC_GOOGLE_TAG } }]
                    : []
                }
              >
                {children}
              </NextCollectProvider>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
