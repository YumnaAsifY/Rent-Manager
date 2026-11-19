type RefreshListener = () => void;

const listeners = new Set<RefreshListener>();

export function subscribeAdminRefresh(listener: RefreshListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAdminRefresh() {
  listeners.forEach((listener) => listener());
}

export function isCurrentAdminScreen(pathname: string, path: string) {
  const target = path.split('?')[0];

  if (target === '/admin') {
    return pathname === '/admin' || pathname === '/admin/';
  }

  if (target === '/admin/users') {
    return pathname === '/admin/users';
  }

  if (target === '/profile') {
    return pathname === '/profile';
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}

export function openAdminScreen(
  router: { replace: (href: any) => void },
  pathname: string,
  path: string
) {
  if (isCurrentAdminScreen(pathname, path)) {
    emitAdminRefresh();
    return;
  }

  router.replace(path);
}
