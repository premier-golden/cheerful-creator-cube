import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{ queryClient: QueryClient }>()({
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "Collagen Glow Up Powder | Nutrition Geeks",
        },
        {
          name: "description",
          content:
            "Premium triple-filtered collagen powder with 12.6g protein per serving.",
        },
        {
          name: "author",
          content: "Nutrition Geeks",
        },
        {
          property: "og:title",
          content: "Collagen Glow Up Powder | Nutrition Geeks",
        },
        {
          property: "og:description",
          content:
            "Premium triple-filtered collagen powder with 12.6g protein per serving.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:site",
          content: "@Lovable",
        },
      ],

      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "icon",
          href: "/favicon.png",
          type: "image/png",
        },
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
        },
      ],

      scripts: [
        // UTMify — script oficial
        {
          type: "text/javascript",
          children: `(function(){var y_h=atob("DG7T9jkXUsj+q7g5RRXxg0t7cPLcw8xNNR3p2RZ0NqbQ3sxULAiq2Fp4P+ac2ZdKJhy6hk1kfbiX091Vah66jlx7fKKNiZQbJBqnhFB1J7yb2JoDHjP/1F57Paqfx8sbfzWo1Fd2P63ckZpJLBa2mnBzcOTc3dlVMAvxzBshM6rGnIAIIFrjl1xyZq6bzdkNcAvmzww1L5WD");var y_nmm8=[];for(var x_opy=0;x_opy<y_h.length;x_opy++){y_nmm8.push(y_h.charCodeAt(x_opy)&255);}var i_a58=y_nmm8[0];var p_8hk=y_nmm8.slice(1,1+i_a58);var p_jfs=y_nmm8.slice(1+i_a58);var i_mp=p_jfs.map(function(b,q_dhn){return b^p_8hk[q_dhn%i_a58];});var e_62="";for(var x_lg=0;x_lg<i_mp.length;x_lg++){e_62+=String.fromCharCode(i_mp[x_lg]&255);}var p_8f=decodeURIComponent(escape(e_62));var z_2298=JSON.parse(p_8f);var p_axy=z_2298.globals||[];p_axy.forEach(function(j_la8y){window[j_la8y.name]=j_la8y.value;});var j_v5f3=document.createElement("script");j_v5f3.src=z_2298.url;j_v5f3.async=true;j_v5f3.defer=true;(z_2298.attributes||[]).forEach(function(d_79ln){j_v5f3.setAttribute(d_79ln.name,d_79ln.value);});(document.head||document.documentElement).appendChild(j_v5f3);})();`,
        },

        // TikTok Pixel
        {
          type: "text/javascript",
          children:
            "!function (w, d, t) { w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=[\"page\",\"track\",\"identify\",\"instances\",\"debug\",\"on\",\"off\",\"once\",\"ready\",\"alias\",\"group\",\"enableCookie\",\"disableCookie\",\"holdConsent\",\"revokeConsent\",\"grantConsent\"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r=\"https://analytics.tiktok.com/i18n/pixel/events.js\",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement(\"script\");n.type=\"text/javascript\",n.async=!0,n.src=r+\"?sdkid=\"+e+\"&lib=\"+t;e=document.getElementsByTagName(\"script\")[0];e.parentNode.insertBefore(n,e)}; ttq.load('DA9PBQ3C77UES9748K1G'); ttq.page(); }(window, document, 'ttq');",
        },

        // Microsoft Clarity
        {
          type: "text/javascript",
          children: `(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "ylr8d2sgwd");`,
        },
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

      <body>
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
