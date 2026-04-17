// Avatar URLs from Flaticon
// Free avatar icons collection
export const AVATAR_COLLECTION = [
  'https://cdn-icons-png.flaticon.com/512/2202/2202112.png',
  'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
  'https://cdn-icons-png.flaticon.com/512/1999/1999625.png',
  'https://cdn-icons-png.flaticon.com/512/1154/1154448.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140061.png',
  'https://cdn-icons-png.flaticon.com/512/13482/13482193.png',
  'https://cdn-icons-png.flaticon.com/512/706/706831.png',
  'https://cdn-icons-png.flaticon.com/512/4128/4128176.png',
] as const;

// Get random avatar from collection
export function getRandomAvatar(): string {
  return AVATAR_COLLECTION[Math.floor(Math.random() * AVATAR_COLLECTION.length)];
}

// Get avatar by index (useful for consistent assignment)
export function getAvatarByIndex(index: number): string {
  return AVATAR_COLLECTION[index % AVATAR_COLLECTION.length];
}

// Get avatar by user ID (deterministic based on ID)
export function getAvatarByUserId(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return getAvatarByIndex(hash);
}
