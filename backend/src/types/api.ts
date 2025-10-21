export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: string };

// '|' -> union type can be either one or the other
