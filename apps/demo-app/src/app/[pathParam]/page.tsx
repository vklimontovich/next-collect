import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function Home({ params }: { params: { pathParam: string } }) {
  return (
    <main>
      <h2>This is a parameterized page [{params.pathParam}]</h2>
      <ul>
        <li>
          Go <Link href="/">Home</Link>
        </li>
      </ul>
    </main>
  )
}
