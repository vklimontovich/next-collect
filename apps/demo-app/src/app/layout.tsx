import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NextCollectProvider } from "next-collect/client"
import Link from "next/link"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "next-collect demo",
  description: "next-collect demo",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="main">
          <section className="content">
            <h1>
              This is a Next.js app for demoing{" "}
              <Link href="https://github.com/jitsucom/next-collect">next-collect</Link>
            </h1>
            <NextCollectProvider>{children}</NextCollectProvider>
          </section>
        </main>
      </body>
    </html>
  )
}