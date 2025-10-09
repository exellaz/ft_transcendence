// const getCircularReplacer = () => {
//   const cache = new WeakSet(); // Use WeakSet for better memory management
//   return (key, value) => {
//     if (typeof value === 'object' && value !== null) {
//       if (cache.has(value)) {
//         // Circular reference found, discard key
//         return; // Returns undefined, effectively removing the key from the output
//       }
//       // Store value in our collection
//       cache.add(value);
//     }
//     return value;
//   };
// };

// // Call this when you want to dump to a file
// export function downloadLogs(logs, filename = "logs.json") {
//   const blob = new Blob(
//     [JSON.stringify(logs, getCircularReplacer(), 2)],
//     { type: "application/json" }
//   );
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   a.click();
//   URL.revokeObjectURL(url);
// }

// export function mapToObject<K, V>(map: Map<K, V>): Record<string, V> {
// 	const obj: Record<string, V> = {};
// 	for (const [key, value] of map.entries()) {
// 		obj[String(key)] = value;
// 	}
// 	return obj;
// }

// function getByteSize(str: string): number {
// 	return new TextEncoder().encode(str).length;
// }
