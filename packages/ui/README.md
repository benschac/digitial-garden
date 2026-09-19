# Shared UI

`@personal-site/ui` exposes the unstyled [Base UI](https://base-ui.com/react/overview/quick-start)
components. Add shared styling and composed components here as they are needed.

```tsx
"use client";

import { Button } from "@personal-site/ui";

export function Example() {
  return <Button onClick={() => console.log("Clicked")}>Click me</Button>;
}
```

This is a just-in-time workspace package: the consuming app compiles its TypeScript.
No separate build step is required. Run its checks through Turborepo:

```sh
bun run lint --filter=@personal-site/ui
bun run check-types --filter=@personal-site/ui
```

Before using portaled popups, follow the Base UI quick start: wrap the application
contents in an element with `isolation: isolate`, leaving portals outside that
element. For iOS 26+ Safari backdrops, use `position: relative` on the body and
`position: absolute` on the backdrop. These layout styles belong to the consuming app.
