import express from "express";
import fs from "fs";
import upload from "../middlewares/upload.js";
import { uploadLocalBucket } from "../helpers/local/uploadLocalBucket.js";
const config = JSON.parse(fs.readFileSync(process.cwd() + "/config.json"));
console.log("config: ", config)
const router = express.Router();

// Upload a file
router.post("/files/:storage_bucket", upload.single('file'), async (req, res) => {
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
        const storageType = bucketConfig.driver;
        switch (storageType) {
            case "local":
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

            case "s3":
                const s3Config = {
                    accessKeyId: params.accessKeyId,
                    secretAccessKey: params.secretAccessKey,
                    region: params.region,
                    bucket: params.bucket,
                    folder: params.folder,
                    acl:
                        params.acl ||
                        params.securityPolicy ||
                        params.bucketSecurityPolicy ||
                        "private",
                    endpoint: params.endpoint,
                };

                return await uploadS3Bucket({
                    s3Config,
                    storage_type,
                    uploadPath,
                    filename,
                    mimetype,
                    mode,
                    exp,
                    fileOrUrl: mode == "url" ? url : file,
                    overwrite,
                });
            case "one_drive":
                return {
                    status: "error",
                    message: "OneDrive upload not yet implemented",
                };
            case "google_drive":
                return {
                    status: "error",
                    message: "Google Drive upload not yet implemented",
                };
            default:
                return { status: "error", message: "Unsupported storage type" };
        }
    } catch (e) {
        res.status(400).json({ status: "error", msg: e?.message || "Something went wrong" });
    }
});

// Get file URL by id

// Delete file by id


export default router;


