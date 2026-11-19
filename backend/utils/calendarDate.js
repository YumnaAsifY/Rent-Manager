const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

/** Store lease days at UTC noon so MongoDB and the calendar day stay the same. */
const toUtcNoon = (year, monthIndex, day) =>
  new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));

const parseCalendarDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const match = value.trim().match(DATE_ONLY);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (!year || !month || !day) {
        return null;
      }
      return toUtcNoon(year, month - 1, day);
    }
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toUtcNoon(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  );
};

const formatCalendarDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

module.exports = {
  parseCalendarDate,
  formatCalendarDate,
};
