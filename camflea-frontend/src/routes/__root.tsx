import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <main className="camflea-standalone-state">
      <section className="camflea-state-card">
        <img src="/camflea-assets/logo.png" alt="CamFlea" />
        <span className="eyebrow">CAMFLEA MARKETPLACE</span>
        <strong className="camflea-state-code">404</strong>
        <h1>That page wandered off.</h1>
        <p>The page you’re looking for doesn’t exist or has moved.</p>
        <Link to="/browse" className="camflea-state-action">
          Browse listings
        </Link>
      </section>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="camflea-standalone-state">
      <section className="camflea-state-card">
        <img src="/camflea-assets/logo.png" alt="CamFlea" />
        <span className="eyebrow">A SMALL DETOUR</span>
        <h1>This page didn’t load.</h1>
        <p>Something went wrong on our end. Try again or head back to the marketplace.</p>
        <div className="camflea-state-actions">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="camflea-state-action"
          >
            Try again
          </button>
          <Link to="/browse" className="camflea-state-action camflea-state-action-secondary">
            Browse listings
          </Link>
        </div>
      </section>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Each content route, including /, can set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CamFlea Marketplace" },
      {
        name: "description",
        content: "A student marketplace for campus buying and selling.",
      },
      { name: "author", content: "CamFlea" },
      { property: "og:title", content: "CamFlea Marketplace" },
      {
        property: "og:description",
        content: "A student marketplace for campus buying and selling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap",
      },
      { rel: "icon", href: "/camflea-assets/logo.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="camflea-body">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
