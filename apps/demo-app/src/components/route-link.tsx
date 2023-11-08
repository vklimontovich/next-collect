import Link from "next/link"
import { ExternalLink } from "lucide-react"

export const RouteLink = ({ children }: { children: string }) => {
  return (
    <Link href={children} className="">
      <code className="inline-flex items-center">
        {children} <ExternalLink className="w-3 h-3 ml-0.5" />
      </code>
    </Link>
  )
}
