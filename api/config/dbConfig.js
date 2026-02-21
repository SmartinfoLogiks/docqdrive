import dotenv from 'dotenv'

dotenv.config()


export const DB_CONFIG = {
  ENGINE: "mysql", // can be switched to "mysql" or "postgres" or "mongo"
  MYSQL: {
        
    host: process.env.MYSQL_HOST || '192.168.0.22', 
    user: process.env.MYSQL_USER || 'nodejs',
    password: process.env.MYSQL_PASSWORD || 'nodejs@2024',
    database: process.env.MYSQL_DATABASE || 'nodejs_docudrive',
    port: 3307,
    enable: true,
    connectionLimit: 4,
    debug: false,
    insecureAuth: true

  },
  MONGO: {
    uri: process.env.MONGO_URI
  },
  POSTGRES: {
    host: "localhost",
    user: "postgres",
    password: "yourpassword",
    database: "manage_bucket",
  },
};

// {
//         
//         host: '192.168.0.22',
//         port: 3307,
//         user: 'nodejs',
//         password: 'nodejs@2024',
//         database: 'nodejs_docudrive',
//         connectionLimit: 4,
//         debug: false,
//         insecureAuth: true
//     }

