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
    const isAdminRoute = rootRoute === 'admin';

    if (!user && !publicRoutes.has(rootRoute)) {
      if (rootRoute !== 'login') {
        router.replace('/login');
      }
      return;
    }

    if (user && isAdminRoute && user.role !== 'admin' && rootRoute !== 'home') {
      router.replace('/home');
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