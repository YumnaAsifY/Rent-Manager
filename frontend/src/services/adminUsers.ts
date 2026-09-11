import { apiRequest } from '@/services/api';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  deactivationReason?: string | null;
  role?: string;
  joinedAt: string;
  assetsCount: number;
  rentalsCount: number;
  payoutMethod?: string;
  ownerPayoutMethod?: string;
  ownerPayoutDetails?: string;
};

export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  const data = await apiRequest<{ users: AdminUser[] }>(
    '/api/users/admin',
    { method: 'GET' },
    token
  );

  return data.users;
}

export async function fetchAdminUserById(
  token: string,
  id: string
): Promise<AdminUser> {
  const data = await apiRequest<{ user: AdminUser }>(
    `/api/users/admin/${id}`,
    { method: 'GET' },
    token
  );

  return data.user;
}

export async function setAdminUserActive(
  token: string,
  id: string,
  isActive: boolean,
  deactivationReason?: 'fraud_scam' | 'platform_misuse' | 'non_payment'
): Promise<AdminUser> {
  const data = await apiRequest<{ user: AdminUser }>(
    `/api/users/admin/${id}/active`,
    {
      method: 'PATCH',
      body: JSON.stringify(
        isActive ? { isActive } : { isActive, deactivationReason }
      ),
    },
    token
  );

  return data.user;
}
