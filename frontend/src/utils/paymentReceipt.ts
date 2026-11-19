import { Alert, Platform } from 'react-native';

export type RentReceipt = {
  receiptNumber: string;
  paidAt?: string | null;
  tenantName: string;
  ownerName: string;
  assetName: string;
  assetLocation?: string | null;
  amount: number;
  currency?: string;
  tracker?: string | null;
  environment?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPaidAt(value?: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  });
}

function formatRentMonth(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  });
}

function formatAmount(amount: number, currency?: string) {
  const money = `Rs ${Number(amount || 0).toLocaleString('en-PK')}`;
  if (!currency || currency === 'PKR') {
    return money;
  }
  return `${money} ${currency}`;
}

function receiptRows(receipt: RentReceipt) {
  const rentMonth = formatRentMonth(receipt.paidAt);
  const rows: [string, string][] = [
    ['Receipt number', receipt.receiptNumber],
    ['Date and time', formatPaidAt(receipt.paidAt)],
    ['Paid by', receipt.tenantName],
    ['Owner', receipt.ownerName],
    ['Asset', receipt.assetName],
  ];

  if (receipt.assetLocation) {
    rows.push(['Location', receipt.assetLocation]);
  }
  if (rentMonth) {
    rows.push(['Rent for', rentMonth]);
  }

  rows.push(
    ['Amount paid', formatAmount(receipt.amount, receipt.currency)],
    ['Payment method', 'Safepay'],
    ['Transaction reference', receipt.tracker || '—'],
    ['Status', 'Paid']
  );

  return rows;
}

function buildReceiptHtml(receipt: RentReceipt) {
  const isTest = String(receipt.environment || '').toLowerCase() === 'sandbox';
  const body = receiptRows(receipt)
    .map(
      ([label, value]) => `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Rent Manager receipt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1B2346; margin: 0; padding: 32px; }
      .sheet { max-width: 640px; margin: 0 auto; }
      h1 { margin: 0; font-size: 28px; }
      .sub { margin: 6px 0 0; color: #64748B; font-size: 14px; }
      .test { display: inline-block; margin-top: 14px; background: #FEF3C7; color: #92400E; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      td { padding: 12px 0; border-bottom: 1px solid #E8ECF4; vertical-align: top; font-size: 14px; }
      td:first-child { width: 42%; color: #64748B; }
      td:last-child { font-weight: 700; text-align: right; }
      .note { margin-top: 28px; color: #94A3B8; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>Rent Manager</h1>
      <p class="sub">Payment receipt</p>
      ${isTest ? '<div class="test">Test payment</div>' : ''}
      <table>${body}</table>
      <p class="note">This is a computer-generated receipt.</p>
    </div>
  </body>
</html>`;
}

function downloadHtmlOnWeb(html: string, filename: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadRentReceipt(receipt: RentReceipt) {
  const html = buildReceiptHtml(receipt);
  const filename = `rent-receipt-${receipt.receiptNumber.slice(-8)}`;

  if (Platform.OS === 'web') {
    downloadHtmlOnWeb(html, `${filename}.html`);
    return;
  }

  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const file = await Print.printToFileAsync({ html });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      await Print.printAsync({ html });
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Download receipt',
      UTI: 'com.adobe.pdf',
    });
  } catch {
    Alert.alert(
      'Receipt',
      'The receipt file could not be saved. Close the app fully, open it again from Expo Go, then try Download receipt.'
    );
  }
}
