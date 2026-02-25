import jwt from 'jsonwebtoken';

// Secret key (store in ENV variable in production)
const SECRET_KEY = "my_super_secret_key";

// Payload (data you want inside token)
const payload = {
    userId: 123,
    email: "user1@example.com",
    scope: ["admin"]
};

// Create token
const token = jwt.sign(payload, SECRET_KEY, {
    expiresIn: "24h",   // token expiry
    issuer: "my-api"
});

console.log("Bearer Token:");
console.log(`Bearer ${token}`);