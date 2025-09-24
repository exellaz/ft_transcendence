// Generates colors based on the user's unique identifier (uid) using a hash function
// Same user always gets same color
export const getUserColor = (uid: string): string => {
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
  
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
};
