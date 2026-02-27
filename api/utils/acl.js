function matchPath(pattern, path) {
    pattern = normalizePath(pattern);
    path = normalizePath(path);

    // Special handling for folder wildcard
    if (pattern.endsWith("/*")) {
        const base = pattern.slice(0, -2);
        return path === base || path.startsWith(base + "/");
    }

    // escape regex special chars except *
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");

    const regex = new RegExp(`^${regexPattern}$`);

    return regex.test(path);
}
function normalizePath(p) {
    if (!p) return "/";

    // ensure leading slash
    if (!p.startsWith("/")) {
        p = "/" + p;
    }

    // collapse multiple slashes
    p = p.replace(/\/+/g, "/");

    // remove trailing slash except root
    if (p.length > 1 && p.endsWith("/")) {
        p = p.slice(0, -1);
    }

    return p;
}

const validateStorageACL = function (userScopes, aclConfig, uploadPath) {
    uploadPath = normalizePath(uploadPath);

    if (!aclConfig) return true;

    if (!Array.isArray(userScopes)) {
        userScopes = [userScopes];
    }

    const matchedRules = [];

    for (const pattern in aclConfig) {
        if (matchPath(pattern, uploadPath)) {
            matchedRules.push(...aclConfig[pattern]);
        }
    }

    if (!matchedRules.length) {
        throw new Error("Access denied: No ACL rule matched");
    }

    const allowed = userScopes.some(scope =>
        matchedRules.includes(scope)
    );

    if (!allowed) {
        throw new Error("Access denied: insufficient permissions");
    }

    return true;
};

export { validateStorageACL };