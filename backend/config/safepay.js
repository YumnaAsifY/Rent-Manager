/**
 * Safepay config from env.
 * Phase 1: placeholders only. Phase 2+ uses these for API calls.
 * Live later: set SAFEPAY_ENV=production and production keys — same code path.
 */
function getSafepayConfig() {
  const env = (process.env.SAFEPAY_ENV || 'sandbox').toLowerCase();
  const isProduction = env === 'production';

  const defaultBaseUrl = isProduction
    ? 'https://api.getsafepay.com'
    : 'https://sandbox.api.getsafepay.com';

  return {
    environment: isProduction ? 'production' : 'sandbox',
    apiBaseUrl: process.env.SAFEPAY_API_BASE_URL || defaultBaseUrl,
    apiKey: process.env.SAFEPAY_API_KEY || '',
    secretKey: process.env.SAFEPAY_SECRET_KEY || '',
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || '',
    adminProfitPercent: Number(process.env.ADMIN_PROFIT_PERCENT || 3),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  };
}

function assertSafepayConfigured() {
  const config = getSafepayConfig();
  if (!config.apiKey || !config.secretKey) {
    const error = new Error(
      'Safepay is not configured. Set SAFEPAY_API_KEY and SAFEPAY_SECRET_KEY in .env'
    );
    error.statusCode = 503;
    throw error;
  }
  return config;
}

module.exports = {
  getSafepayConfig,
  assertSafepayConfigured,
};
