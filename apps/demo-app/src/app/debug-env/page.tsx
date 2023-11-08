import { cookies, headers } from "next/headers"

function sortByKey(dict: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(dict).sort(([a], [b]) => a.localeCompare(b)))
}

async function getProps() {
  return {
    props: {
      env: sortByKey(process.env),
      headers: sortByKey(Object.fromEntries(headers().entries())),
      cookies: sortByKey(
        Object.fromEntries(
          cookies()
            .getAll()
            .map(({ name, value }) => [name, value])
        )
      ),
      nodeVersion: process.versions.node,
    },
  }
}

export default async function Page() {
  const props = await getProps()
  return <pre>{JSON.stringify(props, null, 2)}</pre>
}
