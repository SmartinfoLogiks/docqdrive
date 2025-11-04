// routes/download.js
import express from "express";
import { handleSecureDownload } from "../utils/downloadHandler.js";


const router = express.Router();

router.get("/download/:token", async (req, res) => {
  const { token } = req.params;
  return handleSecureDownload(token, res);
});

export default router;
