import fs from "fs"
import path from "path"
import multer from "multer"

const productsUploadDir = path.resolve("src","uploads", "products")

if (!fs.existsSync(productsUploadDir)) {
  fs.mkdirSync(productsUploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, productsUploadDir)
  },
  filename: (_req, file, cb) => {
    const randomSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const extension = path.extname(file.originalname || "") || ".webp"
    cb(null, `${randomSuffix}${extension}`)
  },
})

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Solo se permiten archivos de imagen"))
    return
  }

  cb(null, true)
}

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})
