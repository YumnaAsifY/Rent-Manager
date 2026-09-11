export const adminTabs = [
  {
    name: 'Dashboard',
    icon: 'grid',
    path: '/admin',
    match: (pathname: string) =>
      pathname === '/admin' || pathname === '/admin/',
  },
  {
    name: 'Payments',
    icon: 'card',
    path: '/admin/payments',
    match: (pathname: string) => pathname.startsWith('/admin/payments'),
  },
  {
    name: 'Reports',
    icon: 'flag',
    path: '/admin/reports',
    match: (pathname: string) => pathname.startsWith('/admin/reports'),
  },
  {
    name: 'Users',
    icon: 'people',
    path: '/admin/users',
    match: (pathname: string) => pathname.startsWith('/admin/users'),
  },
] as const;
