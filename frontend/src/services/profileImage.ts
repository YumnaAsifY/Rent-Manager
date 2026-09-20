import { Platform } from 'react-native';

import { API_BASE_URL, ApiError } from '@/services/api';
import type { AuthUser } from '@/context/AuthContext';

const getImageFileName = (imageUri: string, imageFileName?: string | null) => {
  const fromPicker = imageFileName?.split('/').pop()?.split('?')[0];
  if (fromPicker && fromPicker.includes('.')) {
    return fromPicker;
  }

  const fromUri = imageUri.split('/').pop()?.split('?')[0];
  if (fromUri && fromUri.includes('.')) {
    return fromUri;
  }

  return `profile-${Date.now()}.jpg`;
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

const putFormData = (
  url: string,
  token: string,
  formData: FormData
): Promise<{ ok: boolean; status: number; responseText: string }> => {
  if (Platform.OS === 'web') {
    return fetch(url, {
      method: 'PUT',
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
    xhr.open('PUT', url);
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

export async function uploadProfileImage(
  token: string,
  imageUri: string,
  imageMimeType?: string | null,
  imageFileName?: string | null
): Promise<AuthUser> {
  const formData = new FormData();
  formData.append(
    'image',
    (await buildImagePart(imageUri, imageMimeType, imageFileName)) as any
  );

  let uploadResult: { ok: boolean; status: number; responseText: string };

  try {
    uploadResult = await putFormData(
      `${API_BASE_URL}/api/auth/profile-image`,
      token,
      formData
    );
  } catch {
    throw new ApiError(
      'Could not save profile picture. Check your connection and try again.',
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
        : 'Unable to save profile picture';

    throw new ApiError(message, uploadResult.status);
  }

  return (data as { user: AuthUser }).user;
}
