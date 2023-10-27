import Link from "next/link"

import styles from "./route-link.module.css"

export const RouteLink = ({ children }: { children: string }) => {
  return (
    <Link href={children} className={styles.link}>
      <code>{children}</code>
    </Link>
  )
}
