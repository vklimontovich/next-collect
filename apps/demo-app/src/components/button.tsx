import { PropsWithChildren } from "react"
import Link from "next/link"

export type ButtonProps = { onClick: () => void; href?: never } | { href: string; onClick?: never }

export const Button: React.FC<PropsWithChildren<ButtonProps>> = ({ onClick, href, children }) => {
  const cls = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
  if (href) {
    return (
      <Link href={href} className={`${cls} no-underline`}>
        {children}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
