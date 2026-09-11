const Safepay = require('@sfpy/node-core');

const {
  assertSafepayConfigured,
  getSafepayConfig,
} = require('../config/safepay');

/**
 * Amount for Safepay is in lowest currency unit (paisa for PKR).
 * Rs 45000 → 4500000
 */
function toSafepayAmount(amountPkr) {
  return Math.round(Number(amountPkr) * 100);
}

function createSafepayClient() {
  const config = assertSafepayConfigured();

  return {
    config,
    client: Safepay(config.secretKey, {
      authType: 'secret',
      host: config.apiBaseUrl,
    }),
  };
}

/**
 * Creates Safepay payment session + passport + hosted checkout URL.
 * Same path for sandbox and production (env/keys drive host).
 */
async function createSafepayCheckout({
  amountPkr,
  currency = 'PKR',
  orderId,
}) {
  const { config, client } = createSafepayClient();

  // Safepay only accepts known metadata keys (e.g. order_id).
  // Custom keys like payment_id / rental_id cause: unsupported meta key.
  let sessionResponse;
  try {
    sessionResponse = await client.payments.session.setup({
      merchant_api_key: config.apiKey,
      intent: 'CYBERSOURCE',
      mode: 'payment',
      currency: currency.toUpperCase(),
      amount: toSafepayAmount(amountPkr),
      metadata: {
        order_id: orderId,
      },
    });
  } catch (error) {
    const apiMessage =
      error?.raw?.status?.errors?.[0]?.message ||
      error?.raw?.message ||
      error?.message ||
      'Safepay payment session failed';
    const wrapped = new Error(apiMessage);
    wrapped.statusCode = 502;
    wrapped.details = error;
    throw wrapped;
  }

  const trackerToken = sessionResponse?.data?.tracker?.token;
  if (!trackerToken) {
    const error = new Error('Safepay did not return a payment tracker');
    error.statusCode = 502;
    error.details = sessionResponse;
    throw error;
  }

  const passportResponse = await client.client.passport.create();
  const tbt =
    typeof passportResponse?.data === 'string'
      ? passportResponse.data
      : passportResponse?.data?.token;

  if (!tbt) {
    const error = new Error('Safepay did not return an authentication token');
    error.statusCode = 502;
    error.details = passportResponse;
    throw error;
  }

  const frontendUrl = config.frontendUrl.replace(/\/$/, '');
  // Only paymentId — Safepay may also append tracker; duplicating it corrupts verify.
  const redirectUrl = `${frontendUrl}/payment/success?paymentId=${encodeURIComponent(orderId)}`;
  const cancelUrl = `${frontendUrl}/payment/cancel?paymentId=${encodeURIComponent(orderId)}`;

  const checkoutUrl = client.checkout.createCheckoutUrl({
    env: config.environment,
    tbt,
    tracker: trackerToken,
    source: 'hosted',
    order_id: orderId,
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });

  return {
    tracker: trackerToken,
    checkoutUrl,
    environment: config.environment,
    redirectUrl,
    cancelUrl,
  };
}

function splitPaymentAmounts(totalAmount, profitPercent) {
  const total = Number(totalAmount);
  const percent = Number(profitPercent);
  const adminProfitAmount = Math.round((total * percent) / 100);
  const ownerShareAmount = total - adminProfitAmount;

  return {
    adminProfitPercent: percent,
    adminProfitAmount,
    ownerShareAmount,
  };
}

/**
 * Safepay redirect / query params can corrupt tracker into:
 * track_xxx?order_id=yyy,track_xxx
 * Extract the first valid track_… token only.
 */
function normalizeSafepayTracker(value) {
  if (value == null) {
    return null;
  }

  const raw = Array.isArray(value) ? String(value[0] || '') : String(value);
  const match = raw.match(/track_[a-f0-9-]+/i);
  return match ? match[0] : null;
}

const PAID_STATES = new Set([
  'TRACKER_ENDED',
  'PAID',
  'COMPLETED',
  'TRACKER_COMPLETED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT.SUCCEEDED',
  'SUCCESS',
]);

/**
 * Safepay responses vary:
 * - { data: { tracker: { state } } }
 * - { data: { token, state } }  ← fetch-tracker shape
 * - { tracker: { state } }
 */
function extractSafepayTracker(response) {
  const data = response?.data;

  if (data?.tracker && typeof data.tracker === 'object') {
    return data.tracker;
  }

  if (data && typeof data === 'object' && (data.state || data.status || data.token)) {
    return data;
  }

  if (response?.tracker && typeof response.tracker === 'object') {
    return response.tracker;
  }

  return null;
}

function isSafepayPaymentComplete(response) {
  const tracker = extractSafepayTracker(response);
  const state = String(
    tracker?.state ||
      tracker?.status ||
      response?.data?.state ||
      response?.state ||
      ''
  ).toUpperCase();

  if (PAID_STATES.has(state)) {
    return { isPaid: true, tracker, state };
  }

  const nextKind =
    tracker?.next_actions?.CYBERSOURCE?.kind ||
    tracker?.next_actions?.MPGS?.kind ||
    null;
  const paymentMethod =
    response?.data?.action?.payment_method ||
    tracker?.action?.payment_method ||
    response?.action?.payment_method ||
    null;

  if (nextKind === 'NOOP' && paymentMethod?.last_four) {
    return { isPaid: true, tracker, state: state || 'NOOP_WITH_CARD' };
  }

  return { isPaid: false, tracker, state: state || null };
}

async function fetchSafepayTracker(trackerToken) {
  const cleanTracker = normalizeSafepayTracker(trackerToken);
  if (!cleanTracker) {
    const error = new Error('Safepay tracker is required');
    error.statusCode = 400;
    throw error;
  }

  const { client } = createSafepayClient();
  const response = await client.reporter.payments.fetch(cleanTracker);
  const parsed = isSafepayPaymentComplete(response);

  return {
    raw: response,
    tracker: parsed.tracker,
    state: parsed.state,
    isPaid: parsed.isPaid,
  };
}

/**
 * Poll Safepay a few times — sandbox status can lag after OTP success.
 */
async function fetchSafepayTrackerWithRetry(
  trackerToken,
  { attempts = 4, delayMs = 1500 } = {}
) {
  let last = null;

  for (let i = 0; i < attempts; i += 1) {
    last = await fetchSafepayTracker(trackerToken);
    if (last.isPaid) {
      return last;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return last;
}

module.exports = {
  createSafepayCheckout,
  fetchSafepayTracker,
  fetchSafepayTrackerWithRetry,
  normalizeSafepayTracker,
  splitPaymentAmounts,
  toSafepayAmount,
  getSafepayConfig,
};
