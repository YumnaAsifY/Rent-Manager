const DRAFT_KEY = 'rent-manager-add-asset-draft';

export type AddAssetDraft = {
  assetName: string;
  assetType: string;
  location: string;
  monthlyRent: string;
  description: string;
  image: string | null;
  imageMimeType: string | null;
  imageFileName: string | null;
};

let memoryDraft: AddAssetDraft | null = null;

export const emptyAddAssetDraft: AddAssetDraft = {
  assetName: '',
  assetType: '',
  location: '',
  monthlyRent: '',
  description: '',
  image: null,
  imageMimeType: null,
  imageFileName: null,
};

export function readAddAssetDraft(): AddAssetDraft {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AddAssetDraft>;
        return { ...emptyAddAssetDraft, ...parsed };
      }
    }
  } catch {
    // Use in-memory fallback.
  }

  return memoryDraft ? { ...emptyAddAssetDraft, ...memoryDraft } : emptyAddAssetDraft;
}

export function writeAddAssetDraft(draft: AddAssetDraft) {
  memoryDraft = draft;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  } catch {
    // Ignore storage errors; in-memory fallback still works.
  }
}

export function clearAddAssetDraft() {
  memoryDraft = null;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}
