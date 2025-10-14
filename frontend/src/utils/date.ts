// Discrepancy in time is because database time is stored in UTC
// but will be converted to local time for display.
// database: 2025-10-10T21:40:37.853Z
// local time: 05:38:37
export function formatTimestamp(date: Date | string) {
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  if (isToday) {
    return `${hours}:${minutes}:${seconds}`;
  } else {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

export function formatDate(date: Date | string) {
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  // JavaScript's getMonth() is zero-indexed
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}
