import "./globals.css"
import { NextCollectProvider } from "next-collect/client"

export const metadata = {
  title: "NextCollect",
  description: "NextCollect is a powerful Next.js library for integrating your application with your favourite analytics tools",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextCollectProvider
          debug={true}
          tags={[
            process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && {
              type: "ga4",
              opts: { debug: true, containerId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID },
            },
            process.env.NEXT_PUBLIC_GTM_CONTAINER_ID && {
              type: "gtm",
              opts: { debug: true, containerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID },
            },
          ]}
        />
        <main className="h-screen w-screen bg-neutral-50 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
