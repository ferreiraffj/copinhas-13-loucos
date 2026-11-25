export const logoTypes = 'image/png,image/jpeg,.png,.jpg,.jpeg'
const maxUploadMegabytes = 5
const maxUploadSize = maxUploadMegabytes * 1_000_000
export const logoHelp = `PNG, JPG ou JPEG, até ${maxUploadMegabytes} MB.`
const maxDimension = 320

export async function readLogo(file) {
  const extension = file.name.toLowerCase().match(/\.(png|jpe?g)$/)?.[1]
  if (!extension) throw new Error('Escolha uma imagem PNG, JPG ou JPEG.')
  if (file.size > maxUploadSize) {
    throw new Error(`O arquivo tem ${file.size.toLocaleString('pt-BR')} bytes. O limite é ${maxUploadSize.toLocaleString('pt-BR')} bytes (${maxUploadMegabytes} MB).`)
  }

  const mime = extension === 'png' ? 'image/png' : 'image/jpeg'
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const signature = mime === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255]
  if (!signature.every((byte, index) => bytes[index] === byte)) {
    throw new Error('O conteúdo da imagem não corresponde ao formato do arquivo.')
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível ler a imagem. Tente outro arquivo.')
  })
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL(mime, 0.86)
  } finally {
    bitmap.close()
  }
}

export function logoSource(logo) {
  return typeof logo === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo) ? logo : ''
}
