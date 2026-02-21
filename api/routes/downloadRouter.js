// routes/download.js
import express from "express";
import { handleSecureDownload } from "../utils/downloadHandler.js";


const router = express.Router();

router.get("/download/:token", async (req, res) => {
  const { token } = req.params;
  const { download } = req.query;        // <-- flag from URL
  console.log("token, download: ", token, download)

  // Pass it to the handler
  return handleSecureDownload(token, res, download);
});

export default router;


