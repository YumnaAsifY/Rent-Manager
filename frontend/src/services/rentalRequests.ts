import { apiRequest } from '@/services/api';
import { getAssetImageUrl } from '@/services/assets';

export type ExploreOwner = {
  id: string;
  name: string;
  phoneNumber: string;
};

export type ExploreAsset = {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  image: string;
  status: 'Available' | 'Rented';
  monthlyRent: number | null;
  rent: string | null;
  owner: ExploreOwner | null;
  ownerName: string | null;
  ownerPhone: string | null;
  myRequestStatus: 'Pending' | 'Accepted' | 'Rejected' | null;
  hasPendingRequest: boolean;
  isOwnedByMe?: boolean;
};

export type RentalRequestItem = {
  id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  leaseStartDate: string;
  leaseEndDate: string;
  startDate: string | null;
  endDate: string | null;
  assetName: string;
  assetType: string | null;
  location: string | null;
  description: string;
  image: string | null;
  rent: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  tenantName?: string | null;
  tenantPhone?: string | null;
  viewerRole?: 'owner' | 'tenant';
  tenant?: ExploreOwner | null;
  asset: {
    id: string;
    name: string;
    type: string;
    location: string;
    description: string;
    image: string;
    status: string;
    monthlyRent: number | null;
    rent: string | null;
  } | null;
  owner: ExploreOwner | null;
};

export { getAssetImageUrl };

export async function fetchExploreAssets(
  token: string
): Promise<ExploreAsset[]> {
  const data = await apiRequest<{ assets: ExploreAsset[] }>(
    '/api/assets/explore',
    { method: 'GET' },
    token
  );

  return data.assets;
}

export async function fetchExploreAssetById(
  token: string,
  assetId: string
): Promise<ExploreAsset> {
  const data = await apiRequest<{ asset: ExploreAsset }>(
    `/api/assets/explore/${assetId}`,
    { method: 'GET' },
    token
  );

  return data.asset;
}

export async function createRentalRequest(
  token: string,
  input: {
    assetId: string;
    leaseStartDate: string;
    leaseEndDate: string;
  }
): Promise<RentalRequestItem> {
  const data = await apiRequest<{ request: RentalRequestItem; message: string }>(
    '/api/rental-requests',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );

  return data.request;
}

export async function fetchMyRentalRequests(
  token: string
): Promise<RentalRequestItem[]> {
  const data = await apiRequest<{ requests: RentalRequestItem[] }>(
    '/api/rental-requests/mine',
    { method: 'GET' },
    token
  );

  return data.requests;
}

export async function fetchOwnerRentalRequests(
  token: string
): Promise<RentalRequestItem[]> {
  const data = await apiRequest<{ requests: RentalRequestItem[] }>(
    '/api/rental-requests/owner',
    { method: 'GET' },
    token
  );

  return data.requests;
}

export async function fetchMyPendingRequestsCount(
  token: string
): Promise<number> {
  const data = await apiRequest<{ count: number }>(
    '/api/rental-requests/mine/pending-count',
    { method: 'GET' },
    token
  );

  return data.count;
}

export async function fetchRentalRequestById(
  token: string,
  requestId: string
): Promise<RentalRequestItem> {
  const data = await apiRequest<{ request: RentalRequestItem }>(
    `/api/rental-requests/${requestId}`,
    { method: 'GET' },
    token
  );

  return data.request;
}

/** @deprecated use fetchRentalRequestById */
export const fetchMyRentalRequestById = fetchRentalRequestById;

export async function acceptRentalRequest(
  token: string,
  requestId: string
): Promise<RentalRequestItem> {
  const data = await apiRequest<{ request: RentalRequestItem; message: string }>(
    `/api/rental-requests/${requestId}/accept`,
    { method: 'PATCH' },
    token
  );

  return data.request;
}

export async function rejectRentalRequest(
  token: string,
  requestId: string
): Promise<RentalRequestItem> {
  const data = await apiRequest<{ request: RentalRequestItem; message: string }>(
    `/api/rental-requests/${requestId}/reject`,
    { method: 'PATCH' },
    token
  );

  return data.request;
}

export async function hideRentalRequest(
  token: string,
  requestId: string
): Promise<void> {
  await apiRequest<{ message: string }>(
    `/api/rental-requests/${requestId}/hide`,
    { method: 'PATCH' },
    token
  );
}

export async function hideRentalRequests(
  token: string,
  ids: string[]
): Promise<void> {
  await apiRequest<{ message: string }>(
    '/api/rental-requests/hide-bulk',
    {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    },
    token
  );
}
