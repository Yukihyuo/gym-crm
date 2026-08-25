import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const productsUploadCandidates = [
  path.resolve(__dirname, "..", "uploads", "products"),
  path.resolve(__dirname, "..", "..", "..", "uploads", "products"),
]

const findExistingProductImage = (fileName) => {
  for (const directory of productsUploadCandidates) {
    const absolutePath = path.join(directory, fileName)
    if (fs.existsSync(absolutePath)) {
      return absolutePath
    }
  }

  return null
}

router.get('/', (req, res) => {
  res.json({ message: 'Base API is working' })
})

router.get('/products/:fileName', (req, res) => {
  try {
    const { fileName } = req.params

    if (!fileName || fileName.includes("..") || path.basename(fileName) !== fileName) {
      return res.status(400).json({
        message: "Nombre de archivo inválido",
      })
    }

    const imagePath = findExistingProductImage(fileName)

    if (!imagePath) {
      return res.status(404).json({
        message: "Imagen no encontrada",
      })
    }

    return res.sendFile(imagePath)
  } catch (error) {
    console.error("Error al obtener imagen de producto:", error)
    return res.status(500).json({
      message: "Error al obtener imagen",
      error: error.message,
    })
  }
})

export const routeConfig = { path: "/v1/uploads", router }