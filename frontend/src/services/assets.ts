import { Platform } from 'react-native';

import { API_BASE_URL, ApiError, apiRequest } from '@/services/api';

export type AssetTenant = {
  id: string;
  name: string;
  phoneNumber: string;
};

export type Asset = {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  image: string;
  status: 'Available' | 'Rented';
  monthlyRent: number | null;
  rent: string | null;
  leaseStatus: 'active' | 'ended' | null;
  leaseEnded: boolean;
  tenant: AssetTenant | null;
  tenantName: string | null;
  tenantPhone: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function getAssetImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) {
    return null;
  }

  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('file:')) {
    return imagePath;
  }

  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function fetchMyAssets(token: string): Promise<Asset[]> {
  const data = await apiRequest<{ assets: Asset[] }>(
    '/api/assets/mine',
    { method: 'GET' },
    token
  );

  return data.assets;
}

export async function fetchMyAssetsCount(token: string): Promise<number> {
  const data = await apiRequest<{ count: number }>(
    '/api/assets/mine/count',
    { method: 'GET' },
    token
  );

  return data.count;
}

export async function fetchAssetById(
  token: string,
  assetId: string
): Promise<Asset> {
  const data = await apiRequest<{ asset: Asset }>(
    `/api/assets/${assetId}`,
    { method: 'GET' },
    token
  );

  return data.asset;
}

export type CreateAssetInput = {
  name: string;
  type: string;
  location: string;
  description?: string;
  monthlyRent?: string;
  imageUri: string;
};

async function buildImagePart(imageUri: string) {
  const fileName =
    imageUri.split('/').pop()?.split('?')[0] || `asset-${Date.now()}.jpg`;
  const extension = fileName.includes('.')
    ? fileName.split('.').pop()?.toLowerCase()
    : 'jpg';
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : extension === 'gif'
          ? 'image/gif'
          : 'image/jpeg';

  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || mimeType });
  }

  return {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob;
}

export async function createAsset(
  token: string,
  input: CreateAssetInput
): Promise<Asset> {
  const formData = new FormData();
  formData.append('name', input.name.trim());
  formData.append('type', input.type.trim());
  formData.append('location', input.location.trim());

  if (input.description?.trim()) {
    formData.append('description', input.description.trim());
  }

  if (input.monthlyRent?.trim()) {
    formData.append('monthlyRent', input.monthlyRent.trim());
  }

  formData.append('image', await buildImagePart(input.imageUri));

  const response = await fetch(`${API_BASE_URL}/api/assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  let data: unknown = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : 'Unable to create asset';

    throw new ApiError(message, response.status);
  }

  return (data as { asset: Asset }).asset;
}

export async function makeAssetAvailable(
  token: string,
  assetId: string
): Promise<Asset> {
  const data = await apiRequest<{ asset: Asset; message: string }>(
    `/api/assets/${assetId}/make-available`,
    { method: 'PATCH' },
    token
  );

  return data.asset;
}

export async function deleteAsset(
  token: string,
  assetId: string
): Promise<void> {
  await apiRequest(
    `/api/assets/${assetId}`,
    { method: 'DELETE' },
    token
  );
}
