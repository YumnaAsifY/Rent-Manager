const PAYOUT_METHODS = ['none', 'jazzcash', 'easypaisa', 'bank'];

const PAYOUT_LABELS = {
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank: 'Bank',
};

const normalizePayoutMethod = (value) => {
  if (PAYOUT_METHODS.includes(value)) {
    return value;
  }
  return 'none';
};

const serializePayout = (user) => {
  const payoutMethod = normalizePayoutMethod(user?.payoutMethod);
  return {
    payoutMethod,
    payoutAccountName: user?.payoutAccountName || '',
    payoutNumber: user?.payoutNumber || '',
    payoutBankName: user?.payoutBankName || '',
  };
};

const formatPayoutForAdmin = (user) => {
  const payout = serializePayout(user);

  if (payout.payoutMethod === 'none' || !payout.payoutNumber) {
    return {
      ownerPayoutMethod: 'Not saved',
      ownerPayoutDetails: 'Owner has not saved payout details',
    };
  }

  const methodLabel = PAYOUT_LABELS[payout.payoutMethod];

  if (payout.payoutMethod === 'bank') {
    const parts = [
      payout.payoutAccountName,
      payout.payoutBankName,
      payout.payoutNumber,
    ].filter(Boolean);

    return {
      ownerPayoutMethod: methodLabel,
      ownerPayoutDetails: parts.join(' · '),
    };
  }

  const parts = [payout.payoutAccountName, payout.payoutNumber].filter(Boolean);

  return {
    ownerPayoutMethod: methodLabel,
    ownerPayoutDetails: parts.join(' · '),
  };
};

module.exports = {
  PAYOUT_METHODS,
  PAYOUT_LABELS,
  normalizePayoutMethod,
  serializePayout,
  formatPayoutForAdmin,
};
