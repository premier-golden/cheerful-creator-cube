/**
 * Checkout funnel event names.
 *
 * Shared between the browser tracker and the
 * server function that persists the events, so only
 * this closed list can ever be written.
 *
 * This module is pure metadata: it never touches
 * payments, Stripe, orders or pixels.
 */

export const CHECKOUT_EVENTS = [
  "checkout_view",
  "address_started",
  "address_completed",
  "shipping_options_viewed",
  "shipping_selected",
  "payment_element_loaded",
  "payment_element_failed",
  "pay_clicked",
  "form_validation_failed",
  "form_validation_passed",
  "prepare_order_started",
  "prepare_order_succeeded",
  "prepare_order_failed",
  "elements_submit_succeeded",
  "elements_submit_failed",
  "confirm_payment_started",
  "payment_requires_action",
  "payment_processing",
  "payment_failed",
  "payment_succeeded",
  /* Technical diagnostic, not a funnel step. */
  "css_load_failed",
] as const;

export type CheckoutEvent =
  (typeof CHECKOUT_EVENTS)[number];

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
