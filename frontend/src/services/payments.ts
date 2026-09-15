import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { apiRequest } from '@/services/api';

export type PaymentSessionPayment = {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  adminProfitPercent: number;
  adminProfitAmount: number;
  ownerShareAmount: number;
  safepayTracker: string | null;
  safepayEnvironment: string;
  rentalId: string;
  paidAt?: string | null;
  settledAt?: string | null;
};

export type CreatePaymentSessionResult = {
  payment: PaymentSessionPayment;
  checkoutUrl: string;
  redirectUrl: string;
  cancelUrl: string;
};

export type VerifyPaymentResult = {
  verified: boolean;
  safepayState?: string | null;
  payment: PaymentSessionPayment;
  message?: string;
};

export type AdminPayment = {
  id: string;
  date: string;
  tenantName: string;
  ownerName: string;
  assetName: string;
  totalAmount: number;
  adminProfitPercent: number;
  adminProfitAmount: number;
  ownerShareAmount: number;
  ownerPayoutMethod: string;
  ownerPayoutDetails: string;
  status: 'pending_settlement' | 'settled' | string;
  paidAt?: string | null;
  settledAt?: string | null;
};

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  totalAssets: number;
  pendingSettlements: number;
};

export type PaymentHistoryItem = {
  id: string;
  assetName: string;
  assetLocation: string | null;
  tenantName: string;
  ownerName: string;
  totalAmount: number;
  ownerShareAmount: number;
  status: 'pending_settlement' | 'settled' | string;
  paidAt?: string | null;
  settledAt?: string | null;
  paidDate: string;
  settledDate: string;
  viewerRole: 'tenant' | 'owner';
  rentalId: string;
  assetId: string;
};

export async function createPaymentSession(
  token: string,
  rentalId: string
): Promise<CreatePaymentSessionResult> {
  return apiRequest<CreatePaymentSessionResult>(
    '/api/payments/create-session',
    {
      method: 'POST',
      body: JSON.stringify({ rentalId }),
    },
    token
  );
}

export async function verifyPayment(
  token: string,
  params: { paymentId?: string; tracker?: string }
): Promise<VerifyPaymentResult> {
  return apiRequest<VerifyPaymentResult>(
    '/api/payments/verify',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    token
  );
}

export async function fetchAdminPayments(
  token: string,
  status: 'all' | 'pending_settlement' | 'settled' = 'all'
): Promise<AdminPayment[]> {
  const query = status === 'all' ? 'all' : status;
  const data = await apiRequest<{ payments: AdminPayment[] }>(
    `/api/payments/admin?status=${encodeURIComponent(query)}`,
    { method: 'GET' },
    token
  );

  return data.payments;
}

export async function fetchAdminStats(token: string): Promise<AdminStats> {
  return apiRequest<AdminStats>(
    '/api/payments/admin/stats',
    { method: 'GET' },
    token
  );
}

export async function fetchPaymentHistory(
  token: string
): Promise<PaymentHistoryItem[]> {
  const data = await apiRequest<{ payments: PaymentHistoryItem[] }>(
    '/api/payments/history',
    { method: 'GET' },
    token
  );

  return data.payments;
}

export function getPaymentHistoryStatusLabel(
  item: PaymentHistoryItem
): string {
  if (item.viewerRole === 'tenant') {
    return item.status === 'settled' ? 'Completed' : 'Paid';
  }

  return item.status === 'settled' ? 'Settled' : 'Pending settlement';
}

export async function settleAdminPayment(
  token: string,
  paymentId: string
): Promise<AdminPayment> {
  const data = await apiRequest<{ payment: AdminPayment }>(
    `/api/payments/${paymentId}/settle`,
    { method: 'PATCH' },
    token
  );

  return data.payment;
}

/** Opens Safepay hosted checkout (web redirect / native browser). */
export async function openSafepayCheckout(checkoutUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.href = checkoutUrl;
    }
    return;
  }

  await WebBrowser.openBrowserAsync(checkoutUrl, {
    enableDefaultShareMenuItem: false,
    showInRecents: true,
  });
}
