import { apiRequest } from '@/services/api';

export type AssetCategory = {
  id: string;
  name: string;
};

export type AdminAssetCategory = AssetCategory & {
  totalAssets: number;
  availableAssets: number;
  rentedAssets: number;
};

export async function fetchAssetCategories(
  token: string
): Promise<AssetCategory[]> {
  const data = await apiRequest<{ categories: AssetCategory[] }>(
    '/api/asset-categories',
    { method: 'GET' },
    token
  );

  return data.categories;
}

export async function fetchAdminAssetCategories(
  token: string
): Promise<AdminAssetCategory[]> {
  const data = await apiRequest<{ categories: AdminAssetCategory[] }>(
    '/api/asset-categories/admin',
    { method: 'GET' },
    token
  );

  return data.categories;
}

export async function createAssetCategory(
  token: string,
  name: string
): Promise<AdminAssetCategory> {
  const data = await apiRequest<{ category: AdminAssetCategory }>(
    '/api/asset-categories/admin',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
    token
  );

  return data.category;
}

export async function deleteAssetCategory(
  token: string,
  id: string
): Promise<void> {
  await apiRequest(
    `/api/asset-categories/admin/${id}`,
    { method: 'DELETE' },
    token
  );
}
