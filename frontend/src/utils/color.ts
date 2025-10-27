// Generates colors based on the user's unique identifier (id) using a hash function
// Same user always gets same color
export const getUserColor = (id: number): string => {
  const colors = [
    "text-red-400",
    "text-blue-400",
    "text-green-400",
    "text-yellow-400",
    "text-purple-400",
    "text-pink-400",
    "text-orange-400",
    "text-teal-400",
  ];

  return colors[id % colors.length];
};
