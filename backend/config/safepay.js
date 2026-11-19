/**
 * Safepay config from env.
 * Phase 1: placeholders only. Phase 2+ uses these for API calls.
 * Live later: set SAFEPAY_ENV=production and production keys — same code path.
 */
function resolveFrontendUrl() {
  const lanIp = String(process.env.LAN_IP || '').trim();
  const expoPort = String(process.env.EXPO_PORT || '8081').trim();
  const lanUrl = lanIp ? `http://${lanIp}:${expoPort}` : '';
  const configured = String(process.env.FRONTEND_URL || '')
    .trim()
    .replace(/\/$/, '');

  if (!configured) {
    return lanUrl || 'http://localhost:8081';
  }

  // localhost is the laptop only. A phone cannot open it after Safepay redirects.
  if (/localhost|127\.0\.0\.1/i.test(configured) && lanUrl) {
    return lanUrl;
  }

  return configured;
}

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
    frontendUrl: resolveFrontendUrl(),
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
