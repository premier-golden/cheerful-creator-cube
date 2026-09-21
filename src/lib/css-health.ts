/**
 * Detects whether the global stylesheet was actually
 * applied in the visitor's browser.
 *
 * Purpose: tell apart "Clarity replay lost the CSS"
 * from "a real visitor received an unstyled page".
 *
 * Rules kept deliberately strict:
 * - no extra fetch of the stylesheet
 * - no automatic reload or repair
 * - nothing in the critical render path
 * - fire-and-forget reporting, failures swallowed
 * - at most once per session
 */

import { trackCheckout } from "./checkout-tracking";

/** Value declared for the sentinel in src/styles.css. */
const EXPECTED_OUTLINE_COLOR = "rgb(12, 34, 56)";

const CONFIRM_DELAY_MS = 2000;

let alreadyChecked = false;

/**
 * Creates a throwaway hidden element carrying the
 * sentinel attribute, reads its computed style and
 * removes it again.
 *
 * Returns true when the stylesheet rule was applied.
 */
function sentinelApplied(): boolean {
  const probe = document.createElement("div");

  probe.setAttribute("data-nl-css-sentinel", "");
  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  probe.style.top = "0px";
  probe.style.width = "1px";
  probe.style.height = "1px";
  probe.setAttribute("aria-hidden", "true");

  document.body.appendChild(probe);

  try {
    const applied =
      window.getComputedStyle(probe).outlineColor;

    return applied === EXPECTED_OUTLINE_COLOR;
  } finally {
    probe.remove();
  }
}

/**
 * Runs the check after the page finished loading and,
 * when it looks like a failure, confirms it once more
 * after a short delay to avoid false positives from a
 * stylesheet that is simply still arriving.
 */
export function monitorCssHealth(): void {
  if (typeof window === "undefined") return;
  if (alreadyChecked) return;

  alreadyChecked = true;

  const verify = () => {
    try {
      if (sentinelApplied()) return;

      /* Second opinion before reporting anything. */
      window.setTimeout(() => {
        try {
          if (sentinelApplied()) return;

          trackCheckout("css_load_failed", {
            errorCode: "css_load_failed",
          });
        } catch {
          /* never surface anything to the visitor */
        }
      }, CONFIRM_DELAY_MS);
    } catch {
      /* never surface anything to the visitor */
    }
  };

  const schedule = () => {
    const idle = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void) => void;
      }
    ).requestIdleCallback;

    if (typeof idle === "function") {
      idle(verify);
      return;
    }

    window.setTimeout(verify, 1200);
  };

  try {
    if (document.readyState === "complete") {
      schedule();
      return;
    }

    window.addEventListener("load", schedule, {
      once: true,
    });
  } catch {
    /* never surface anything to the visitor */
  }
}
