// excludes 'password' and relations
export const userPublicSelect = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  status: true,
  joinedAt: true,
  updatedAt: true,
};

export const userSettingsPublicSelect = {
  userId: true,
  language: true,
};
