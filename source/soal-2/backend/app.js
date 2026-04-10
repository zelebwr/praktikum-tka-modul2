const express = require("express");
const multer = require("multer");
const Minio = require("minio");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucket = process.env.MINIO_BUCKET;

minioClient.bucketExists(bucket, function (err, exists) {
  if (err) return console.log(err);
  if (!exists) {
    minioClient.makeBucket(bucket, "us-east-1");
    console.log("Bucket created");
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    await minioClient.fPutObject(bucket, file.originalname, file.path);

    fs.unlinkSync(file.path);

    res.json({
      message: "File uploaded successfully",
      fileName: file.originalname,
    });
  } catch (err) {
    res.status(500).json({
      message: "Upload failed",
      error: err.message,
    });
  }
});

app.get("/files", async (req, res) => {
  const stream = minioClient.listObjects(bucket, "", true);
  const files = [];

  stream.on("data", (obj) => files.push(obj.name));
  stream.on("end", () => res.json({ files }));
  stream.on("error", (err) =>
    res.status(500).json({ error: err.message })
  );
});

app.listen(3000, () => console.log("Backend running"));