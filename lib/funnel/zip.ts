import { inflateRawSync } from 'node:zlib'

export type ZipEntry = {
  name: string
  data: Buffer
  compressedSize: number
  uncompressedSize: number
}

const MAX_ENTRIES = 250
const MAX_TOTAL_UNCOMPRESSED = 40 * 1024 * 1024
const MAX_ENTRY_UNCOMPRESSED = 15 * 1024 * 1024
const MAX_COMPRESSION_RATIO = 1000

function u16(buf: Buffer, offset: number) { return buf.readUInt16LE(offset) }
function u32(buf: Buffer, offset: number) { return buf.readUInt32LE(offset) }

function safePath(raw: string) {
  const normalized = raw.replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('\0')) return null
  const parts = normalized.split('/').filter(Boolean)
  if (parts.some((part) => part === '.' || part === '..')) return null
  if (parts.some((part) => /^[a-zA-Z]:$/.test(part))) return null
  return parts.join('/')
}

export function parseZip(input: Buffer): ZipEntry[] {
  if (input.length < 22) throw new Error('ZIP file is too small or invalid.')
  const min = Math.max(0, input.length - 22 - 0xffff)
  let eocd = -1
  for (let i = input.length - 22; i >= min; i--) {
    if (u32(input, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Invalid ZIP: end-of-central-directory record not found.')

  const disk = u16(input, eocd + 4)
  const centralDisk = u16(input, eocd + 6)
  const entriesOnDisk = u16(input, eocd + 8)
  const entriesTotal = u16(input, eocd + 10)
  const centralSize = u32(input, eocd + 12)
  const centralOffset = u32(input, eocd + 16)
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entriesTotal) throw new Error('Multi-disk ZIP archives are not supported.')
  if (entriesTotal > MAX_ENTRIES) throw new Error(`ZIP contains too many files (maximum ${MAX_ENTRIES}).`)
  if (centralOffset + centralSize > input.length) throw new Error('Invalid ZIP central directory.')

  const entries: ZipEntry[] = []
  const seen = new Set<string>()
  let cursor = centralOffset
  let total = 0

  for (let i = 0; i < entriesTotal; i++) {
    if (cursor + 46 > input.length || u32(input, cursor) !== 0x02014b50) throw new Error('Invalid ZIP central directory entry.')
    const flags = u16(input, cursor + 8)
    const method = u16(input, cursor + 10)
    const compressedSize = u32(input, cursor + 20)
    const uncompressedSize = u32(input, cursor + 24)
    const nameLen = u16(input, cursor + 28)
    const extraLen = u16(input, cursor + 30)
    const commentLen = u16(input, cursor + 32)
    const localOffset = u32(input, cursor + 42)
    const nameStart = cursor + 46
    const nameEnd = nameStart + nameLen
    if (nameEnd + extraLen + commentLen > input.length) throw new Error('Invalid ZIP filename metadata.')

    const name = safePath(input.subarray(nameStart, nameEnd).toString('utf8'))
    cursor = nameEnd + extraLen + commentLen
    if (!name) throw new Error('ZIP contains an unsafe or empty path.')
    if (name.endsWith('/')) continue
    if (seen.has(name)) throw new Error(`ZIP contains duplicate path: ${name}`)
    seen.add(name)
    if (flags & 0x1) throw new Error(`Encrypted ZIP entries are not supported: ${name}`)
    if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED) throw new Error(`File is too large: ${name}`)
    if (compressedSize === 0 && uncompressedSize > 0) throw new Error(`Invalid compressed data: ${name}`)
    if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO) throw new Error(`Suspicious compression ratio: ${name}`)
    total += uncompressedSize
    if (total > MAX_TOTAL_UNCOMPRESSED) throw new Error('ZIP expands beyond the 40 MB safety limit.')

    if (localOffset + 30 > input.length || u32(input, localOffset) !== 0x04034b50) throw new Error(`Invalid local ZIP header: ${name}`)
    const localNameLen = u16(input, localOffset + 26)
    const localExtraLen = u16(input, localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const dataEnd = dataStart + compressedSize
    if (dataEnd > input.length) throw new Error(`ZIP entry exceeds archive bounds: ${name}`)

    const compressed = input.subarray(dataStart, dataEnd)
    let data: Buffer
    try {
      if (method === 0) data = Buffer.from(compressed)
      else if (method === 8) data = inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_UNCOMPRESSED })
      else throw new Error(`Unsupported ZIP compression method ${method}`)
    } catch {
      throw new Error(`Unable to safely decompress: ${name}`)
    }
    if (data.length !== uncompressedSize) throw new Error(`ZIP size mismatch: ${name}`)
    entries.push({ name, data, compressedSize, uncompressedSize })
  }

  return entries
}
