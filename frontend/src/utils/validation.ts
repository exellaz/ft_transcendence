export const validateUsername = (
  username: string,
  t: (key: string) => string
): { isValid: boolean; error?: string } => {
  if (!username.trim()) {
    return { isValid: false, error: t("common.username_required") };
  }

  const trimmed = username.trim();

  // Length check: 3-12 characters
  if (trimmed.length < 3 || trimmed.length > 12) {
    return { isValid: false, error: t("common.username_length") };
  }

  // Character check: only a-z, A-Z, 0-9, _
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { isValid: false, error: t("common.username_characters") };
  }

  return { isValid: true };
};
