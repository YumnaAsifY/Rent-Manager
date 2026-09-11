import { apiRequest } from '@/services/api';

export type UserReport = {
  id: string;
  type: 'fake_property' | 'spam_misuse' | 'unpaid_rent';
  status: 'pending' | 'dismissed' | 'warned' | 'resolved';
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  createdAt?: string;
};

export async function submitReport(
  token: string,
  body: { type: UserReport['type']; assetId?: string; requestId?: string }
): Promise<void> {
  await apiRequest('/api/reports', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function fetchAdminReports(token: string): Promise<UserReport[]> {
  const data = await apiRequest<{ reports: UserReport[] }>(
    '/api/reports/admin',
    { method: 'GET' },
    token
  );
  return data.reports;
}

export async function reviewAdminReport(
  token: string,
  id: string,
  action: 'dismiss' | 'warn' | 'deactivate'
): Promise<void> {
  await apiRequest(
    `/api/reports/admin/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    },
    token
  );
}
