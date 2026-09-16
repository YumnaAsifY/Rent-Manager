const toNameKey = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const toDisplayName = (value) => {
  const trimmed = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!trimmed) {
    return '';
  }

  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

module.exports = { toNameKey, toDisplayName };
