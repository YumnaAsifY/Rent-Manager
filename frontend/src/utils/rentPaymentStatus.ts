export type RentPaymentStatus =
  | 'unpaid'
  | 'overdue'
  | 'paid'
  | 'settled'
  | null
  | undefined;

export function getTenantRentStatusLabel(status: RentPaymentStatus) {
  if (status === 'overdue') return 'Overdue';
  if (status === 'unpaid') return 'Unpaid';
  if (status === 'paid') return 'Pending settlement';
  if (status === 'settled') return 'Paid for this month';
  return null;
}

export function getOwnerRentStatusLabel(status: RentPaymentStatus) {
  if (status === 'overdue') return 'Tenant overdue';
  if (status === 'unpaid') return 'Tenant unpaid';
  if (status === 'paid') return 'Tenant paid — your share pending';
  if (status === 'settled') return 'Your share received';
  return null;
}

export function getRentStatusColors(status: RentPaymentStatus) {
  if (status === 'overdue') {
    return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
  }
  if (status === 'unpaid') {
    return { backgroundColor: '#FEF3C7', color: '#B45309' };
  }
  if (status === 'paid') {
    return { backgroundColor: '#DBEAFE', color: '#1D4ED8' };
  }
  if (status === 'settled') {
    return { backgroundColor: '#DCFCE7', color: '#15803D' };
  }
  return { backgroundColor: '#F1F5F9', color: '#64748B' };
}
