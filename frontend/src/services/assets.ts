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
  rentPaymentStatus?: 'unpaid' | 'overdue' | 'paid' | 'settled' | null;
  rentPaymentLabel?: string | null;
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
  imageMimeType?: string | null;
  imageFileName?: string | null;
};

const getImageFileName = (imageUri: string, imageFileName?: string | null) => {
  const fromPicker = imageFileName?.split('/').pop()?.split('?')[0];
  if (fromPicker && fromPicker.includes('.')) {
    return fromPicker;
  }

  const fromUri = imageUri.split('/').pop()?.split('?')[0];
  if (fromUri && fromUri.includes('.')) {
    return fromUri;
  }

  return `asset-${Date.now()}.jpg`;
};

const getImageMimeType = (fileName: string, imageMimeType?: string | null) => {
  if (imageMimeType && imageMimeType.startsWith('image/')) {
    return imageMimeType === 'image/jpg' ? 'image/jpeg' : imageMimeType;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const normalizeNativeImageUri = (imageUri: string) => {
  if (
    Platform.OS === 'android' &&
    !imageUri.startsWith('file://') &&
    !imageUri.startsWith('content://') &&
    !imageUri.startsWith('http://') &&
    !imageUri.startsWith('https://')
  ) {
    return `file://${imageUri}`;
  }

  return imageUri;
};

async function buildImagePart(
  imageUri: string,
  imageMimeType?: string | null,
  imageFileName?: string | null
) {
  const fileName = getImageFileName(imageUri, imageFileName);
  const mimeType = getImageMimeType(fileName, imageMimeType);

  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || mimeType });
  }

  return {
    uri: normalizeNativeImageUri(imageUri),
    name: fileName,
    type: mimeType,
  };
}

const sendAssetFormData = (
  method: 'POST' | 'PUT',
  url: string,
  token: string,
  formData: FormData
): Promise<{ ok: boolean; status: number; responseText: string }> => {
  if (Platform.OS === 'web') {
    return fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      responseText: await response.text(),
    }));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60000;
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        responseText: xhr.responseText || '',
      });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.ontimeout = () => reject(new Error('network'));
    xhr.send(formData);
  });
};

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

  formData.append(
    'image',
    (await buildImagePart(
      input.imageUri,
      input.imageMimeType,
      input.imageFileName
    )) as any
  );

  let uploadResult: { ok: boolean; status: number; responseText: string };

  try {
    uploadResult = await sendAssetFormData(
      'POST',
      `${API_BASE_URL}/api/assets`,
      token,
      formData
    );
  } catch (uploadError) {
    throw new ApiError(
      'Phone could not reach the server. Keep the same Wi-Fi as your laptop and make sure the backend is running.',
      0
    );
  }

  let data: unknown = {};

  if (uploadResult.responseText) {
    try {
      data = JSON.parse(uploadResult.responseText);
    } catch {
      data = {};
    }
  }

  if (!uploadResult.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : 'Unable to create asset';

    throw new ApiError(message, uploadResult.status);
  }

  return (data as { asset: Asset }).asset;
}

export type UpdateAssetInput = {
  name: string;
  type: string;
  location: string;
  description?: string;
  monthlyRent?: string;
  imageUri?: string | null;
  imageMimeType?: string | null;
  imageFileName?: string | null;
};

const isRemoteImage = (imageUri: string) =>
  /^https?:\/\//i.test(imageUri) || imageUri.startsWith('/uploads/');

export async function updateAsset(
  token: string,
  assetId: string,
  input: UpdateAssetInput
): Promise<Asset> {
  const formData = new FormData();
  formData.append('name', input.name.trim());
  formData.append('type', input.type.trim());
  formData.append('location', input.location.trim());

  if (input.description?.trim()) {
    formData.append('description', input.description.trim());
  } else {
    formData.append('description', '');
  }

  if (input.monthlyRent?.trim()) {
    formData.append('monthlyRent', input.monthlyRent.trim());
  }

  if (input.imageUri && !isRemoteImage(input.imageUri)) {
    formData.append(
      'image',
      (await buildImagePart(
        input.imageUri,
        input.imageMimeType,
        input.imageFileName
      )) as any
    );
  }

  let uploadResult: { ok: boolean; status: number; responseText: string };

  try {
    uploadResult = await sendAssetFormData(
      'PUT',
      `${API_BASE_URL}/api/assets/${assetId}`,
      token,
      formData
    );
  } catch {
    throw new ApiError(
      'Phone could not reach the server. Keep the same Wi-Fi as your laptop and make sure the backend is running.',
      0
    );
  }

  let data: unknown = {};

  if (uploadResult.responseText) {
    try {
      data = JSON.parse(uploadResult.responseText);
    } catch {
      data = {};
    }
  }

  if (!uploadResult.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : 'Unable to update asset';

    throw new ApiError(message, uploadResult.status);
  }

  return (data as { asset: Asset }).asset;
}

export async function assignAssetToTenant(
  token: string,
  assetId: string,
  email: string,
  leaseStartDate: string,
  leaseEndDate: string
): Promise<Asset> {
  const data = await apiRequest<{ asset: Asset; message: string }>(
    `/api/assets/${assetId}/assign`,
    {
      method: 'POST',
      body: JSON.stringify({ email, leaseStartDate, leaseEndDate }),
    },
    token
  );

  return data.asset;
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

export async function removeTenantFromAsset(
  token: string,
  assetId: string,
  reason: string
): Promise<Asset> {
  const data = await apiRequest<{ asset: Asset; message: string }>(
    `/api/assets/${assetId}/remove-tenant`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
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
