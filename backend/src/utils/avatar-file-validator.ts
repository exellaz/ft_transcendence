export class AvatarFileValidator {
  private allowedExtensions: string[];

  constructor() {
    this.allowedExtensions = [".jpg", ".jpeg", ".png"];
  }

  validateFile(filename: string | undefined | null): {
    valid: boolean;
    errors: string[];
  } {
    const result = { valid: true, errors: [] as string[] };

    // Check filename exists
    if (!filename || filename.trim() === "") {
      result.valid = false;
      result.errors.push("No filename provided");
      return result;
    }

    // Check file extension
    const extIndex = filename.lastIndexOf(".");
    const ext =
      extIndex !== -1 ? filename.toLowerCase().substring(extIndex) : "";

    if (!this.allowedExtensions.includes(ext)) {
      result.valid = false;
      result.errors.push(
        `File extension '${ext}' not allowed. Allowed: ${this.allowedExtensions.join(", ")}`,
      );
    }

    return result;
  }
}
