import { apiRequest } from '@/services/api';
import { getAssetImageUrl } from '@/services/assets';

export type RentalOwner = {
  id: string;
  name: string;
  phoneNumber: string;
};

export type RentalAsset = {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  image: string;
  monthlyRent: number | null;
};

export type Rental = {
  id: string;
  status: 'Active' | 'Expired';
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  monthlyRent: number | null;
  rent: string | null;
  asset: RentalAsset | null;
  name: string;
  type: string | null;
  location: string | null;
  description: string;
  image: string | null;
  owner: RentalOwner | null;
  ownerName: string | null;
  ownerPhone: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export { getAssetImageUrl as getRentalImageUrl };

export async function fetchMyRentals(token: string): Promise<Rental[]> {
  const data = await apiRequest<{ rentals: Rental[] }>(
    '/api/rentals/mine',
    { method: 'GET' },
    token
  );

  return data.rentals;
}

export async function fetchMyRentalsCount(token: string): Promise<number> {
  const data = await apiRequest<{ count: number }>(
    '/api/rentals/mine/count',
    { method: 'GET' },
    token
  );

  return data.count;
}

export async function fetchRentalById(
  token: string,
  rentalId: string
): Promise<Rental> {
  const data = await apiRequest<{ rental: Rental }>(
    `/api/rentals/${rentalId}`,
    { method: 'GET' },
    token
  );

  return data.rental;
}
