import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/AuthContext';

const publicRoutes = new Set([
  '',
  'index',
  'login',
  'registration',
  'forgot-password',
  'reset-password',
]);

function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const rootRoute = segments[0] ?? '';

    if (!user && !publicRoutes.has(rootRoute)) {
      router.replace('/login');
    }
  }, [isLoading, router, segments, user]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  );
}