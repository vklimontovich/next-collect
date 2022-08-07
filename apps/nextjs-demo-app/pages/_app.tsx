import "../styles/globals.css"
import type { AppProps } from "next/app"
import { useEffect } from "react"
import { useRouter } from "next/router"
import { useCollector } from "next-collect/client"

export default function DemoApp({ Component, pageProps }: AppProps) {
  const collect = useCollector()
  const router = useRouter()
  useEffect(() => {
    collect.event("page_render", {})
  }, [router.asPath])
  return <Component {...pageProps} />
}
