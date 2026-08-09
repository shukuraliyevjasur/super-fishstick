# Deferred work

Only revisit an item when its trigger is true. Completed review-era tasks were removed from this
working list; their history remains in `docs/archive/`.

## Telegram Payments

**Trigger:** an agency asks for it and replie has a working payment rail.

Telegram payment-provider tokens are per customer, so this is a separate merchant-onboarding
problem. Start with `sendInvoice`, `answerPreCheckoutQuery`, and `successful_payment` only after
deciding how provider tokens are encrypted and rotated.

## Meta App Review materials

**Trigger:** a YaTT/legal entity exists and Meta Business Verification can be submitted.

The current screencast/permission material is stale. Update it only immediately before
submission. Pilot customers can be added manually as test users in the meantime.

## Flow editor accessibility polish

**Trigger:** agencies are actively building larger flows.

Add keyboard move-up/move-down controls for flow steps. A read-only canvas view is optional and
should not begin until there is evidence the list/drill-in editor is insufficient.
