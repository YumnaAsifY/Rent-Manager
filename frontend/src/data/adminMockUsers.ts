export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  joinedAt: string;
  assetsCount: number;
  rentalsCount: number;
};

let users: AdminUser[] = [
  {
    id: 'u1',
    name: 'Ali Khan',
    email: 'ali.khan@email.com',
    phone: '03001234567',
    isActive: true,
    joinedAt: '2026-01-12',
    assetsCount: 3,
    rentalsCount: 1,
  },
  {
    id: 'u2',
    name: 'Sara Ahmed',
    email: 'sara.ahmed@email.com',
    phone: '03219876543',
    isActive: true,
    joinedAt: '2026-02-03',
    assetsCount: 0,
    rentalsCount: 2,
  },
  {
    id: 'u3',
    name: 'Hassan Raza',
    email: 'hassan.raza@email.com',
    phone: '03335551212',
    isActive: false,
    joinedAt: '2026-03-18',
    assetsCount: 1,
    rentalsCount: 0,
  },
  {
    id: 'u4',
    name: 'Nadia Malik',
    email: 'nadia.malik@email.com',
    phone: '03450001122',
    isActive: true,
    joinedAt: '2026-04-22',
    assetsCount: 4,
    rentalsCount: 0,
  },
  {
    id: 'u5',
    name: 'Usman Ali',
    email: 'usman.ali@email.com',
    phone: '03112223344',
    isActive: true,
    joinedAt: '2026-05-09',
    assetsCount: 2,
    rentalsCount: 1,
  },
  {
    id: 'u6',
    name: 'Fatima Noor',
    email: 'fatima.noor@email.com',
    phone: '03098765432',
    isActive: false,
    joinedAt: '2026-06-14',
    assetsCount: 0,
    rentalsCount: 1,
  },
];

export function getAdminUsers(): AdminUser[] {
  return users.map((u) => ({ ...u }));
}

export function getAdminUserById(id: string): AdminUser | undefined {
  const found = users.find((u) => u.id === id);
  return found ? { ...found } : undefined;
}

export function setAdminUserActive(
  id: string,
  isActive: boolean
): AdminUser | undefined {
  const index = users.findIndex((u) => u.id === id);
  if (index < 0) {
    return undefined;
  }
  users[index] = { ...users[index], isActive };
  return { ...users[index] };
}
