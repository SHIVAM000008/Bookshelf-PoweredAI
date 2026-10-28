
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const uploadDirectory = path.join(__dirname, "..", "uploads", "book-covers");

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Cover must be a JPEG, PNG, or WebP image.")
      );
    }

    callback(null, true);
  },
});

function detectImage(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { extension: "jpg", type: "image/jpeg" };
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return { extension: "png", type: "image/png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp", type: "image/webp" };
  }

  return null;
}

async function saveCover(file) {
  if (!file) return null;

  const detected = detectImage(file.buffer);

  if (!detected || detected.type !== file.mimetype) {
    const error = new Error("The uploaded file is not a valid supported image.");
    error.status = 400;
    throw error;
  }

  const filename = `${crypto.randomUUID()}.${detected.extension}`;
  const destination = path.join(uploadDirectory, filename);

  await fs.promises.writeFile(destination, file.buffer, { flag: "wx" });

  return `/uploads/book-covers/${filename}`;
}

async function deleteCover(coverUrl) {
  if (!coverUrl?.startsWith("/uploads/book-covers/")) return;

  const filename = path.basename(coverUrl);
  const filePath = path.join(uploadDirectory, filename);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  uploadBookCover: upload.single("cover"),
  saveCover,
  deleteCover,
};
