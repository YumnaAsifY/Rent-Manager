import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiError, apiRequest } from '@/services/api';

import {
  getStoredToken,
  removeStoredToken,
  storeToken,
} from '@/services/authStorage';
import { uploadProfileImage } from '@/services/profileImage';

export type PayoutMethod = 'none' | 'jazzcash' | 'easypaisa' | 'bank';

export type AuthUser = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  pendingEmail?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
  profileImage?: string;
  payoutMethod?: PayoutMethod;
  payoutAccountName?: string;
  payoutNumber?: string;
  payoutBankName?: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type SessionResponse = {
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<AuthUser>;

  logout: () => Promise<void>;

  updateProfile: (
    name: string,
    phoneNumber: string,
    payout?: {
      payoutMethod: PayoutMethod;
      payoutAccountName: string;
      payoutNumber: string;
      payoutBankName: string;
    },
    email?: string
  ) => Promise<void>;

  updateProfileImage: (
    imageUri: string,
    imageMimeType?: string | null,
    imageFileName?: string | null
  ) => Promise<void>;

  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore persistent login session
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const savedToken = await getStoredToken();

        if (!savedToken) {
          return;
        }

        const data = await apiRequest<SessionResponse>(
          '/api/auth/me',
          {
            method: 'GET',
          },
          savedToken
        );

        if (isMounted) {
          setToken(savedToken);
          setUser(data.user);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await removeStoredToken();
        }

        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiRequest<LoginResponse>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      await storeToken(data.token);

      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    await removeStoredToken();

    setToken(null);
    setUser(null);
  }, []);

  // Update Profile
  const updateProfile = useCallback(
    async (
      name: string,
      phoneNumber: string,
      payout?: {
        payoutMethod: PayoutMethod;
        payoutAccountName: string;
        payoutNumber: string;
        payoutBankName: string;
      },
      email?: string
    ) => {
      if (!token) {
        throw new ApiError(
          'Authentication required',
          401
        );
      }

      const data = await apiRequest<SessionResponse>(
        '/api/auth/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            name,
            phoneNumber,
            ...(payout || {}),
            ...(email !== undefined ? { email } : {}),
          }),
        },
        token
      );

      setUser(data.user);
    },
    [token]
  );

  const updateProfileImage = useCallback(
    async (
      imageUri: string,
      imageMimeType?: string | null,
      imageFileName?: string | null
    ) => {
      if (!token) {
        throw new ApiError('Authentication required', 401);
      }

      const updatedUser = await uploadProfileImage(
        token,
        imageUri,
        imageMimeType,
        imageFileName
      );

      setUser(updatedUser);
    },
    [token]
  );

  // Change Password
  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ) => {
      if (!token) {
        throw new ApiError(
          'Authentication required',
          401
        );
      }

      await apiRequest(
        '/api/auth/change-password',
        {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
        token
      );
    },
    [token]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      updateProfile,
      updateProfileImage,
      changePassword,
    }),
    [
      user,
      token,
      isLoading,
      login,
      logout,
      updateProfile,
      updateProfileImage,
      changePassword,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}