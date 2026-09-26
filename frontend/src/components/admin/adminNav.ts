export type AdminTab = {
  name: string;
  icon: string;
  path: string;
  match: (pathname: string) => boolean;
  inBottomNav?: boolean;
};

export const adminTabs: AdminTab[] = [
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
    path: '/admin/users?view=total',
    match: (pathname: string) => pathname.startsWith('/admin/users'),
  },
  {
    name: 'Asset Category',
    icon: 'layers',
    path: '/admin/asset-categories',
    match: (pathname: string) =>
      pathname.startsWith('/admin/asset-categories'),
    inBottomNav: false,
  },
];
