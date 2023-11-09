![How Next Collect Works](./README/hero-light.png?raw=true#gh-light-mode-only)
![How Next Collect Works](./README/hero-dark.png?raw=true#gh-dark-mode-only)

# Overview

`next-collect` is a library for server-side analytics integration for Next.Js. It works
with following platforms:

- [Jitsu](https://jitsu.com)
- [Segment](https://segment.com)
- [Plausible.io](https://plausible.io)

Following integrations are coming soon:

- Mixpanel
- Amplitude
- June.so
- Posthog
- Rudderstack

If you're not familiar with server-side event collection, please read [this article](https://jitsu.com/blog/server-side-tracking) first.

## Quick Start

`npm install --save next-collect`. Make sure that Next.Js version is at least 13.0

### Step 1. Add following lines to `middleware.ts`

```typescript
import { nextCollectMiddleware } from "next-collect/server"

export default nextCollectMiddleware()
```

If you don't have `middleware.ts` yet, create it in the root of your Next.Js project or `src` folder if you're using it.
See Next.Js [documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware) for more details

If you already have a middleware, just wrap it with `nextCollectMiddleware()`

```typescript
import { nextCollectMiddleware } from "next-collect/server"

//your custom middleware
const middleware = (req, res) => {}

export default nextCollectMiddleware({ middleware })
```

### Step 2. Define destination

Tell `next-collect` where to send the data. Put following variables to `.env` file:

```bash

#For segment
SEGMENT_KEY=...

#For Jitsu
JITSU_WRITE_KEY=...

#For Plausible
PLAUSIBLE_DOMAIN=...
```

That's it! This configuration will send all page views to destination.

### Step 3: provide user id

If your app has authorization, you probably want to identify users.
To do so, define a custom enrich function `middleware.ts`:

```typescript
import { nextCollectMiddleware } from "next-collect/server"
import { getServerSession } from "next-auth"

export default nextCollectMiddleware({
  enrich: async (event, { nextRequest }, prev) => {
    //call default enrich function that resolves IP into geo and etc
    prev(event)

    //For Supabase
    const supabase = createMiddlewareClient({ req: nextRequest, res: nextResponse })
    const session = await supabase.auth.getSession()
    event.userId = session.data?.session?.user?.id

    //For NextAuth
    event.userId = (await getServerSession()).user.id

    //For Firebase
    //TODO:

    return event
  },
})
```

Depending on the auth framework you're using, you'll need to get a user id. Usually, userId can be
derived from session or token that is stored in cookies or auth header

#### Step 4. Sending custom events from server

For the most cases you'll need to send a custom events on a certain actions. For example, once
user signs up, you'll need to send `user_signup` event. Once user logs in, it's a good idea to
send an `.identify()` call

```typescript
import { nextCollect } from "next-collect/server"

// src/pages/api/sign-up.ts
export async function POST(req: NextRequest, res: NextResponse) {
  const { analytics } = nextCollect(req, res)
  analytics.track("user_signup", { email: req.body.email })
}

// src/pages/api/login.ts
export async function POST(req: NextRequest, res: NextResponse) {
  const { analytics } = nextCollect(req, res)
  analytics.identify({ email: req.body.email })
}
```

### Step 4. Sending custom events from client

Some events naturally happen on the client side. For example, user clicks on a button or scrolls down to a certain
element on a page. For such cases, you can use `nextCollect` hook:

```tsx
import { useCollect } from "next-collect/client"

export default function Page() {
  const { analytics } = useCollect()

  return <button onClick={() => analytics.track("button_click")}>Click me!</button>
}
```

Make sure that you're component is wrapped with `NextCollectProvider`:

```tsx
import { NextCollectProvider } from "next-collect/client"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <NextCollectProvider>{children}</NextCollectProvider>
}
```

---

## Advanced Configuration

`next-collect` is deeply customizable. It's possible to define a custom enrichment, provide custom destination,
change `/api/ev` route and many more. Please see `NextCollectConfig` type for a full list of options. Pass
an instance of `NextCollectConfig` to `nextCollectMiddleware`

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md)
