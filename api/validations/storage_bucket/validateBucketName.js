export const validateBucketName = (name) => {
  if (typeof name !== "string") throw new Error("Bucket name must be a string");

  // Trim spaces just in case
  name = name.trim();

  // Length check (AWS requirement)
  if (name.length < 3 || name.length > 63) {
    throw new Error("Bucket name must be between 3 and 63 characters.");
  }

  // Only lowercase letters, numbers, and hyphens allowed
  if (!/^[a-z0-9.-]+$/.test(name)) {
    throw new Error(
      "Bucket name may contain only lowercase letters, numbers, dots, and hyphens."
    );
  }

  // Cannot have uppercase letters or underscores
  if (/[A-Z_]/.test(name)) {
    throw new Error(
      "Bucket name cannot contain uppercase letters or underscores."
    );
  }

  // Must start and end with alphanumeric
  if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name)) {
    throw new Error(
      "Bucket name must start and end with a lowercase letter or number."
    );
  }

  // Cannot look like an IP address
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) {
    throw new Error("Bucket name cannot be formatted as an IP address.");
  }

  // No consecutive dots
  if (/\.\./.test(name)) {
    throw new Error("Bucket name cannot contain consecutive periods ('..').");
  }

  // Cannot contain dot-hyphen or hyphen-dot sequences
  if (/(\.-)|(-\.)/.test(name)) {
    throw new Error(
      "Bucket name cannot contain dot-hyphen or hyphen-dot sequences."
    );
  }

  return true;
};
