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

export type AuthUser = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
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
  ) => Promise<void>;

  logout: () => Promise<void>;

  updateProfile: (
    name: string,
    phoneNumber: string
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
      phoneNumber: string
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
          }),
        },
        token
      );

      // Immediately update the authenticated user state
      setUser(data.user);
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
      changePassword,
    }),
    [
      user,
      token,
      isLoading,
      login,
      logout,
      updateProfile,
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