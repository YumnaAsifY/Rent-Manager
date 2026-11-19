import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { LogBox, Platform, useWindowDimensions } from 'react-native';

const ignoredTouchWarnings = [
  'Cannot record touch end without a touch start',
  'Ended a touch event which was not counted in `trackedTouchCount`',
];

LogBox.ignoreLogs(ignoredTouchWarnings);

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args.map((item) => String(item)).join(' ');
  if (ignoredTouchWarnings.some((warning) => message.includes(warning))) {
    return;
  }
  originalWarn(...args);
};

import { AuthProvider, useAuth } from '@/context/AuthContext';
import OwnerShell from '@/components/OwnerShell';

const publicRoutes = new Set([
  '',
  'index',
  'login',
  'registration',
  'forgot-password',
  'reset-password',
  'verify-email',
]);

function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

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
if (user && isAdminRoute && user.role !== 'admin') {
  router.replace('/home');
  return;
}
}, [isLoading, router, segments, user]);

  const rootRoute = segments[0] ?? '';
  const showOwnerShell =
    Boolean(user) &&
    user?.role !== 'admin' &&
    !publicRoutes.has(rootRoute) &&
    rootRoute !== 'admin' &&
    isDesktop;

  if (showOwnerShell) {
    return (
      <OwnerShell>
        <Slot />
      </OwnerShell>
    );
  }

  return <Slot />;
}


export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  );
}