import assert from "node:assert/strict";
import test from "node:test";

import { canReleaseOrder, quoteOrder } from "../src/order-risk.js";

test("checkout quote preserves the customer-visible total", () => {
  assert.deepEqual(quoteOrder({ subtotalCents: 2500, shippingTier: "standard" }), {
    subtotalCents: 2500,
    shippingCents: 499,
    totalCents: 2999,
    needsManualReview: false,
  });
});

test("expensive orders require manual review before release", () => {
  assert.equal(quoteOrder({ subtotalCents: 99600, shippingTier: "standard" }).needsManualReview, true);
});

test("orders are released only when payment, stock, and risk checks all pass", () => {
  assert.equal(canReleaseOrder({ paid: true, stockAvailable: true, flagged: false }), true);
  assert.equal(canReleaseOrder({ paid: false, stockAvailable: true, flagged: false }), false);
  assert.equal(canReleaseOrder({ paid: true, stockAvailable: false, flagged: false }), false);
  assert.equal(canReleaseOrder({ paid: true, stockAvailable: true, flagged: true }), false);
});
