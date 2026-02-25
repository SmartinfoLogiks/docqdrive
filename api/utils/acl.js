function matchPath(pattern, path) {
    // escape regex special chars except *
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
}

const validateStorageACL = function (userScopes, aclConfig, uploadPath) {
    console.log("validateStorageACL: ", userScopes, aclConfig, uploadPath)
    if (!aclConfig) return true;

    // normalize scopes → always array
    if (!Array.isArray(userScopes)) {
        userScopes = [userScopes];
    }

    const matchedRules = [];
    for (const pattern in aclConfig) {
        if (matchPath(pattern, uploadPath)) {
            matchedRules.push(...aclConfig[pattern]);
        }
    }

    // No ACL rule matched
    if (!matchedRules.length) {
        throw new Error("Access denied: No ACL rule matched");
    }

    // Check intersection
    const allowed = userScopes.some(scope =>
        matchedRules.includes(scope)
    );

    if (!allowed) {
        throw new Error("Access denied: insufficient permissions");
    }

    return true;
}

export { validateStorageACL };