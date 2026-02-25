import express from "express";
import fs from "fs";
import upload from "../middlewares/upload.js";
import authMiddleware from "../middlewares/auth.js";
import { uploadLocalBucket } from "../helpers/local/uploadLocalBucket.js";
import { uploadS3Bucket } from "../helpers/s3/uploadS3Bucket.js";
import { validateStorageACL } from "../utils/acl.js"
const config = JSON.parse(fs.readFileSync(process.cwd() + "/config.json"));
console.log("config: ", config)
const router = express.Router();

// Upload a file
router.post("/files/:storage_bucket", authMiddleware, upload.single('file'), async (req, res) => {
    console.log("file: ", req.file)
    try {
        const { storage_bucket: storageBucket } = req.params;
        console.log("storage_bucket: ", storageBucket, req.body)
        let {
            path: uploadPath,
            filename,
            mode,
            file,
            exp,
            overwrite,
            mimetype,
            url
        } = req.body;
        if (!file && req.file) file = req.file;
        const bucketConfig = config['storage'][storageBucket];
        if (!bucketConfig) {
            res.status(400).json({ status: "error", msg: "Bucket configuration missing" });
        }

        console.log("bucketConfig: ", bucketConfig)
        console.log("req.user - ", req.user)
        validateStorageACL(req.user.scope, bucketConfig.acl, uploadPath);

        const storageType = bucketConfig.driver;
        switch (storageType) {
            case "local": {
                const response = await uploadLocalBucket(
                    storageBucket,
                    storageType,
                    uploadPath,
                    filename,
                    mimetype,
                    mode,
                    exp,
                    mode == "url" ? url : file,
                    overwrite
                );
                console.log("response: ", response)
                return res.json(response);
            }

            case "s3": {
                const s3Config = {
                    accessKeyId: bucketConfig.params.aws_key,
                    secretAccessKey: bucketConfig.params.aws_secret,
                    region: bucketConfig.params.aws_region,
                    bucket: bucketConfig.params.aws_bucket,
                    folder: uploadPath,
                    acl:
                        bucketConfig.params.aws_default_policy ||
                        "private",
                    endpoint: bucketConfig.params.aws_endpoint,
                };

                console.log("s3Config: ", s3Config)

                const response = await uploadS3Bucket({
                    s3Config,
                    storage_type: storageType,
                    uploadPath,
                    filename,
                    mimetype,
                    mode,
                    exp,
                    fileOrUrl: mode == "url" ? url : file,
                    overwrite,
                });

                console.log("response: ", response)
                return res.json(response);
            }

            case "one_drive":
                return res.json({
                    status: "error",
                    message: "OneDrive upload not yet implemented",
                });
            case "google_drive":
                return res.json({
                    status: "error",
                    message: "Google Drive upload not yet implemented",
                });
            default:
                return res.json({ status: "error", message: "Unsupported storage type" });
        }
    } catch (e) {
        res.status(400).json({ status: "error", msg: e?.message || "Something went wrong" });
    }
});

// Get file URL by id

// Delete file by id


export default router;


