export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  outputType?: "image/webp" | "image/jpeg" | "image/png"
}

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(imageUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(new Error("No se pudo leer la imagen seleccionada"))
    }

    image.src = imageUrl
  })

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  outputType: string,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir la imagen"))
          return
        }
        resolve(blob)
      },
      outputType,
      quality
    )
  })

export async function compressProductImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.8,
    outputType = "image/webp",
  } = options

  const image = await loadImageFromFile(file)

  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const targetWidth = Math.max(1, Math.round(image.width * scale))
  const targetHeight = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("No se pudo inicializar el canvas para procesar la imagen")
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const blob = await canvasToBlob(canvas, outputType, quality)

  const baseName = file.name.replace(/\.[^/.]+$/, "") || "product-image"
  const extension = outputType === "image/webp" ? "webp" : outputType === "image/jpeg" ? "jpg" : "png"

  return new File([blob], `${baseName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  })
}
