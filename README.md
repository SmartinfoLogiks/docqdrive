

# File Storage Service (Local Bucket + Secure Token Downloads)

This project is a Node.js powered file-storage API that supports creating buckets, uploading files, generating secure short-lived download URLs, and listing bucket contents.
The storage layer currently uses the **local filesystem** with MySQL metadata tracking.
Built to be easy to extend later into S3, OneDrive, or Google Drive.

---

# Features

* Create local storage buckets
* Upload files (attachment or base64)
* Short-lived signed download URLs
* Secure file streaming with token verification
* List folders inside a bucket
* List files inside a bucket
* Cron job auto-cleans expired files
* MySQL-based metadata table
* Ready for multi-storage engines (placeholders for S3, OneDrive, Google Drive)

---

# Tech Stack

* Node.js + Express
* MySQL (via mysql2)
* Multer
* Joi
* JSON-based encrypted download tokens
* node-cron
* Dotenv (configuration)

---

# Folder Structure

```
buckets/            # All local bucket storage
cron/               # Auto-delete expired files
models/             # DB models
utils/              # Bucket utils (upload, create, list, download)
routes/             # Token-based download router
server/             # REST server logic
config/             # DB configuration
```

---

# Installation & Full Server Setup

Below is everything needed to install this project on a new machine or remote server.

---

## 1. System Requirements

* Node.js 18+
* MySQL 5.7+ or MySQL 8
* npm


---



## 2. Environment Variables

Create `.env` in the project root:

```
HOST=
REST_PORT=8000
SOCKET_PORT=

MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=manage_bucket

BASE_DOWNLOAD_URL=http://your-server-ip:8000

DOWNLOAD_TOKEN_SECRET=your-long-secret-key
DOWNLOAD_TOKEN_EXPIRY=600

CRON_SCHEDULE=*/1 * * * *
```

Important notes:

| Variable                | Meaning                               |
| ----------------------- | ------------------------------------- |
| `DOWNLOAD_TOKEN_SECRET` | Used to sign/verify secure tokens     |
| `DOWNLOAD_TOKEN_EXPIRY` | Token TTL (seconds)                   |
| `BASE_DOWNLOAD_URL`     | Used to generate public download URLs |
| `CRON_SCHEDULE`         | How often files should auto-delete    |

---

## 3. MySQL Installation

Ubuntu example:

```
sudo apt update
sudo apt install mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql
```

Login:

```
mysql -u root -p
```

Create DB:

```
CREATE DATABASE manage_bucket;
```

---

## 4. Create Required Table

Run inside MySQL:

```
USE manage_bucket;

CREATE TABLE file_tbl (
  id CHAR(36) NOT NULL DEFAULT (UUID()),               -- UUID for unique ID
  file_name TEXT NOT NULL,                             -- File name
  relative_path TEXT NOT NULL,                         -- Relative file path
  storage_type ENUM('local', 's3', 'one_drive', 'google_drive') NOT NULL, -- Storage type
  bucket TEXT NOT NULL,                           -- Bucket name
  size BIGINT,                                         -- File size in bytes
  mimetype VARCHAR(100),                               -- MIME type
  exp BIGINT,                                          -- Expiration (UNIX timestamp)
  upload_status ENUM('pending', 'complete', 'failed') DEFAULT 'pending', -- Upload status
  blocked ENUM('true', 'false') DEFAULT 'false',       -- Blocked flag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,      -- Creation time
  created_unix BIGINT DEFAULT (UNIX_TIMESTAMP()),      -- Creation time in UNIX
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Edit time
  created_by VARCHAR(100) DEFAULT 'root',              -- Created by
  edited_by VARCHAR(100),                              -- Edited by
  PRIMARY KEY (id)
);
```

Table roles:

* Tracks uploaded files
* Records expiry timestamp (exp)
* Stores local file path
* Used by secure download handler
* Used by cron cleanup service

---

## 5. DB Configuration File Location

Main DB config:

```
config/dbconfig.js
```

DB client:

```
utils/dbClient.js
```

Default MySQL config:

```
MYSQL: {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: 3307,
  connectionLimit: 4
}
```

If your MySQL runs on default port:

```
port: 3306
```

---

## 6. Install Node Modules

```
npm install
```

### Development mode:

```
npm run dev
```

### Production mode:

```
npm start
```

---

## 7. Cron Job (Auto Delete Expired Files)

Cleanup logic lives in:

```
cron/deleteExpiredFiles.js
```

Works automatically inside your Node.js app.
No external cron required unless you want to run it separately.

You can change cron schedule from `.env`:

```
CRON_SCHEDULE=*/1 * * * *
```






---

## 8. Deploying on Remote Server 

1. SSH into server
2. Install Node + MySQL
3. Clone project
4. Create `.env`
5. Install dependencies
6. Start server

```
npm install
npm start
```





---

# API Endpoints

## 1. Create Bucket

```
POST /run?tool=storage_bucket&message=create_bucket&storage_type=local&bucket_name=mybucket
```

## 2. Upload File (Form-Data)

```
POST /run?tool=storage_bucket&message=upload_file&storage_type=local&bucket=mybucket&filename=test.pdf&mimetype=application/pdf&mode=attachment
```

## Upload with Base64 Content

```
POST /run?tool=storage_bucket&message=upload_file&storage_type=local&bucket=mybucket&filename=note.txt&mode=content
{
  "file": "<base64>"
}
```

## 3. Generate Download Link

```
When requesting a file through the API:

POST /run?tool=storage_bucket&message=download_file
     &fileId=<FILE_ID>
     &storage_type=local
     &bucket=<BUCKET_NAME>
     &download=<true|false>


Your choice of download=true or download=false controls what the final public URL will do when opened in a browser.

1. download=true

The generated short-lived URL will look like:

/download/<signed_token>?download=true


When you paste this URL into a browser, the file starts downloading immediately.


2. download=false

The generated URL will look like:

/download/<signed_token>?download=false


When you open this URL:

Files like images, PDFs, text files, etc. open directly in the browser instead of downloading.

```




## 4. Actual File Download

```
GET /download/:token?download=false

GET /download/:token?download=true
```

Verifies token and streams file.

## 5. List Files

```
POST /run?tool=storage_bucket&message=list_files&storage_type=local&bucket=mybucket
```

## 6. List Directories

```
POST /run?tool=storage_bucket&message=list_dir&storage_type=local&bucket=mybucket
```

---

# Notes

* All bucket storage is inside `/buckets`
* Tokens expire automatically after define defined time
* Cron deletes expired files and updates DB
* Project is architected to support additional storage platforms

---


