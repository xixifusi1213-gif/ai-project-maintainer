const shippingRates = {
  standard: 499,
  expedited: 1299,
};

export function quoteOrder({ subtotalCents, shippingTier }) {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new TypeError("subtotalCents must be a non-negative integer");
  }

  if (!Object.hasOwn(shippingRates, shippingTier)) {
    throw new RangeError(`unsupported shipping tier: ${shippingTier}`);
  }

  const shippingCents = shippingRates[shippingTier];
  const totalCents = subtotalCents + shippingCents;

  return {
    subtotalCents,
    shippingCents,
    totalCents,
    needsManualReview: totalCents >= 100000,
  };
}

export function canReleaseOrder({ paid, flagged, stockAvailable }) {
  return Boolean(paid && stockAvailable && !flagged);
}
