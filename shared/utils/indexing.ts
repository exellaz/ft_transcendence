export function middle<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined; // no middle
  return arr[Math.floor(arr.length / 2)];
}

export function lastElem<T>(array: T[]): T {
  return array[array.length - 1];
}
