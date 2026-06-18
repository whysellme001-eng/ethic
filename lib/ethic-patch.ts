// MP4 "10x sample-count" patch, ported from the Ethic browser extension popup.
// Pure client-side binary manipulation of the MP4 atom tree. No network, no deps.

const FAKE_SAMPLE = new Uint8Array([0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00])
const U32_MAX = 0xffffffff
const U64_LIMIT = Number.MAX_SAFE_INTEGER

export const SIZE_WARNING_BYTES = 50 * 1024 * 1024

export function fmtBytes(n: number): string {
  const u = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i ? 2 : 0)} ${u[i]}`
}

type Box = { type: string; size: number; header: number; start: number; end: number }

function typeAt(bytes: Uint8Array, off: number): string {
  return String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3])
}
function dv(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}
function readU32(bytes: Uint8Array, off: number): number {
  return dv(bytes).getUint32(off, false)
}
function readI32(bytes: Uint8Array, off: number): number {
  return dv(bytes).getInt32(off, false)
}
function readU64(bytes: Uint8Array, off: number): number {
  const v = dv(bytes)
  const hi = v.getUint32(off, false)
  const lo = v.getUint32(off + 4, false)
  return hi * 4294967296 + lo
}
function readI64(bytes: Uint8Array, off: number): number {
  const hi = dv(bytes).getInt32(off, false)
  const lo = dv(bytes).getUint32(off + 4, false)
  return hi * 4294967296 + lo
}
function writeU32(bytes: Uint8Array, off: number, val: number): void {
  if (!Number.isFinite(val) || val < 0 || val > U32_MAX) throw new Error(`uint32 overflow writing ${val}`)
  dv(bytes).setUint32(off, Math.round(val), false)
}
function writeU64(bytes: Uint8Array, off: number, val: number): void {
  if (!Number.isFinite(val) || val < 0 || val > U64_LIMIT)
    throw new Error(`uint64 value too large for browser-safe patch: ${val}`)
  const hi = Math.floor(val / 4294967296)
  const lo = Math.round(val - hi * 4294967296)
  const v = dv(bytes)
  v.setUint32(off, hi, false)
  v.setUint32(off + 4, lo, false)
}

function boxSizeAt(bytes: Uint8Array, off: number, end: number): Box {
  if (off + 8 > end) throw new Error("Truncated MP4 box header.")
  let size = readU32(bytes, off)
  let header = 8
  const type = typeAt(bytes, off + 4)
  if (size === 1) {
    size = readU64(bytes, off + 8)
    header = 16
  } else if (size === 0) {
    size = end - off
  }
  if (size < header || off + size > end) throw new Error(`Bad MP4 box ${type} at ${off}, size ${size}.`)
  return { type, size, header, start: off, end: off + size }
}
function parseBoxes(bytes: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = []
  let pos = start
  while (pos + 8 <= end) {
    const b = boxSizeAt(bytes, pos, end)
    out.push(b)
    pos = b.end
  }
  return out
}
function headerSize(box: Uint8Array): number {
  return readU32(box, 0) === 1 ? 16 : 8
}
function boxType(box: Uint8Array): string {
  return typeAt(box, 4)
}
function childStart(box: Uint8Array): number {
  const t = boxType(box)
  const h = headerSize(box)
  return t === "meta" ? h + 4 : h
}
function children(box: Uint8Array): Box[] {
  return parseBoxes(box, childStart(box), box.length)
}
function findChild(box: Uint8Array, type: string): Uint8Array | null {
  for (const b of children(box)) if (b.type === type) return box.slice(b.start, b.end)
  return null
}
function findPath(box: Uint8Array, path: string[]): Uint8Array | null {
  let cur: Uint8Array | null = box
  for (const t of path) {
    cur = findChild(cur, t)
    if (!cur) return null
  }
  return cur
}
function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(size)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
function makeBox(type: string, payload: Uint8Array, large = false): Uint8Array {
  const size = payload.length + (large ? 16 : 8)
  const out = new Uint8Array(size)
  if (large) {
    writeU32(out, 0, 1)
    out.set([...type].map((c) => c.charCodeAt(0)), 4)
    writeU64(out, 8, size)
    out.set(payload, 16)
  } else {
    writeU32(out, 0, size)
    out.set([...type].map((c) => c.charCodeAt(0)), 4)
    out.set(payload, 8)
  }
  return out
}
function rebuildContainer(box: Uint8Array, mapChild: (child: Uint8Array, t: string) => Uint8Array): Uint8Array {
  const t = boxType(box)
  const h = headerSize(box)
  const cs = childStart(box)
  const prefix = box.slice(h, cs)
  const parts: Uint8Array[] = [prefix]
  for (const b of parseBoxes(box, cs, box.length)) {
    const child = box.slice(b.start, b.end)
    parts.push(mapChild(child, b.type))
  }
  return makeBox(t, concat(parts), h === 16)
}

function parseMvhd(mvhd: Uint8Array) {
  const version = mvhd[headerSize(mvhd)]
  if (version === 0) return { version, timescale: readU32(mvhd, 20), duration: readU32(mvhd, 24) }
  return { version, timescale: readU32(mvhd, 28), duration: readU64(mvhd, 32) }
}
function parseTkhd(tkhd: Uint8Array) {
  const version = tkhd[headerSize(tkhd)]
  const widthOff = version === 0 ? 84 : 96
  const heightOff = version === 0 ? 88 : 100
  return {
    version,
    duration: version === 0 ? readU32(tkhd, 28) : readU64(tkhd, 36),
    width: readU32(tkhd, widthOff) / 65536,
    height: readU32(tkhd, heightOff) / 65536,
  }
}
function parseMdhd(mdhd: Uint8Array) {
  const version = mdhd[headerSize(mdhd)]
  if (version === 0) return { version, timescale: readU32(mdhd, 20), duration: readU32(mdhd, 24) }
  return { version, timescale: readU32(mdhd, 28), duration: readU64(mdhd, 32) }
}
function handlerType(trak: Uint8Array): string {
  const hdlr = findPath(trak, ["mdia", "hdlr"])
  if (!hdlr) return ""
  return typeAt(hdlr, headerSize(hdlr) + 8)
}
function stsdCodec(stsd: Uint8Array | null): string {
  if (!stsd) return ""
  const entryCount = readU32(stsd, 12)
  if (!entryCount) return ""
  return typeAt(stsd, 16 + 4)
}
function parseStts(stts: Uint8Array) {
  const n = readU32(stts, 12)
  let sampleCount = 0
  let totalTicks = 0
  let lastDelta = 0
  const entries: { count: number; delta: number }[] = []
  const deltaWeight = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const o = 16 + i * 8
    const c = readU32(stts, o)
    const d = readU32(stts, o + 4)
    entries.push({ count: c, delta: d })
    sampleCount += c
    totalTicks += c * d
    lastDelta = d
    deltaWeight.set(d, (deltaWeight.get(d) || 0) + c)
  }
  let primaryDelta = lastDelta
  let bestCount = -1
  for (const [delta, count] of deltaWeight.entries()) {
    if (count > bestCount) {
      bestCount = count
      primaryDelta = delta
    }
  }
  return { entryCount: n, entries, sampleCount, totalTicks, lastDelta, primaryDelta }
}
function parseStsz(stsz: Uint8Array) {
  const sampleSize = readU32(stsz, 12)
  const sampleCount = readU32(stsz, 16)
  let trailingEight = 0
  if (sampleSize === 0) {
    for (let i = sampleCount - 1; i >= 0 && i >= sampleCount - 5000; i--) {
      if (readU32(stsz, 20 + i * 4) === 8) trailingEight++
      else break
    }
  }
  return { sampleSize, sampleCount, trailingEight }
}
function parseStsc(stsc: Uint8Array) {
  const n = readU32(stsc, 12)
  if (!n) throw new Error("Video stsc has no entries.")
  const o = 16 + (n - 1) * 12
  return {
    entryCount: n,
    lastFirstChunk: readU32(stsc, o),
    lastSamplesPerChunk: readU32(stsc, o + 4),
    lastDescId: readU32(stsc, o + 8),
  }
}
function parseChunkTable(stcoOrCo64: Uint8Array) {
  const t = boxType(stcoOrCo64)
  const n = readU32(stcoOrCo64, 12)
  return { type: t, count: n }
}
function parseElst(elst: Uint8Array | null) {
  if (!elst) return null
  const version = elst[headerSize(elst)]
  const entryCount = readU32(elst, 12)
  if (!entryCount) return null
  if (version === 0) return { version, entryCount, segmentDuration: readU32(elst, 16), mediaTime: readI32(elst, 20) }
  return { version, entryCount, segmentDuration: readU64(elst, 16), mediaTime: readI64(elst, 24) }
}

type MoovInfo = ReturnType<typeof analyzeMoov>

function analyzeMoov(moov: Uint8Array) {
  const mvhd = findChild(moov, "mvhd")
  if (!mvhd) throw new Error("No mvhd atom found.")
  const movie = parseMvhd(mvhd)
  if (!movie.timescale) throw new Error("Movie timescale is zero.")

  let video: any = null
  for (const b of children(moov)) {
    if (b.type !== "trak") continue
    const trak = moov.slice(b.start, b.end)
    if (handlerType(trak) !== "vide") continue
    const tkhd = findChild(trak, "tkhd")
    const mdhd = findPath(trak, ["mdia", "mdhd"])
    const stbl = findPath(trak, ["mdia", "minf", "stbl"])
    if (!tkhd || !mdhd || !stbl) continue
    const stsd = findChild(stbl, "stsd")
    const stsz = findChild(stbl, "stsz")
    const stts = findChild(stbl, "stts")
    const stsc = findChild(stbl, "stsc")
    const stco = findChild(stbl, "stco") || findChild(stbl, "co64")
    if (!stsz || !stts || !stsc || !stco) throw new Error("Video track is missing stsz/stts/stsc/stco atoms.")
    const codec = stsdCodec(stsd)
    if (codec !== "avc1" && codec !== "avc3")
      throw new Error(
        `Video codec sample entry is ${codec || "unknown"}, not avc1/avc3. This exact fake sample patch is AVC/H.264-only.`,
      )
    const tk = parseTkhd(tkhd)
    const md = parseMdhd(mdhd)
    const ts = parseStts(stts)
    const sz = parseStsz(stsz)
    const sc = parseStsc(stsc)
    const co = parseChunkTable(stco)
    if (sz.sampleSize !== 0) throw new Error("Fixed-size stsz video samples are not supported.")
    if (ts.sampleCount !== sz.sampleCount)
      throw new Error(`stts sample count (${ts.sampleCount}) does not match stsz sample count (${sz.sampleCount}).`)
    if (!ts.primaryDelta) throw new Error("Could not read frame delta from stts.")
    const elst = parseElst(findPath(trak, ["edts", "elst"]))
    video = { codec, tkhd: tk, mdhd: md, stts: ts, stsz: sz, stsc: sc, chunks: co, elst }
    break
  }
  if (!video) throw new Error("No AVC/H.264 video track found.")

  const frameRate = video.mdhd.timescale / video.stts.primaryDelta
  const targetFrames = video.stsz.sampleCount * 10
  const fakeCount = targetFrames - video.stsz.sampleCount
  if (fakeCount < 1) throw new Error("Target sample count is not higher than the current video. Nothing to patch.")
  if (fakeCount > 250000)
    throw new Error(`Refusing to add ${fakeCount} fake samples. Use a shorter source or lower multiplier.`)

  const fakeTicks = fakeCount * video.stts.primaryDelta
  const newSttsTotal = video.stts.totalTicks + fakeTicks

  return { movie, video, frameRate, targetFrames, fakeCount, fakeTicks, newSttsTotal }
}

function patchStts(stts: Uint8Array, fakeCount: number, fakeDelta: number): Uint8Array {
  const n = readU32(stts, 12)
  if (!n) throw new Error("Cannot patch empty stts.")
  const last = 16 + (n - 1) * 8
  const lastDelta = readU32(stts, last + 4)
  if (lastDelta === fakeDelta) {
    const out = new Uint8Array(stts)
    writeU32(out, last, readU32(out, last) + fakeCount)
    return out
  }
  const oldPayload = stts.slice(headerSize(stts))
  const payload = new Uint8Array(oldPayload.length + 8)
  payload.set(oldPayload, 0)
  writeU32(payload, 4, n + 1)
  const o = oldPayload.length
  writeU32(payload, o, fakeCount)
  writeU32(payload, o + 4, fakeDelta)
  return makeBox("stts", payload, headerSize(stts) === 16)
}
function patchCtts(ctts: Uint8Array, fakeCount: number): Uint8Array {
  const n = readU32(ctts, 12)
  if (!n) return ctts
  const last = 16 + (n - 1) * 8
  const version = ctts[headerSize(ctts)]
  const lastOffset = version === 0 ? readU32(ctts, last + 4) : readI32(ctts, last + 4)
  if (lastOffset === 0) {
    const out = new Uint8Array(ctts)
    writeU32(out, last, readU32(out, last) + fakeCount)
    return out
  }
  const payload = new Uint8Array(ctts.length - headerSize(ctts) + 8)
  payload.set(ctts.slice(headerSize(ctts)), 0)
  writeU32(payload, 4, n + 1)
  const o = payload.length - 8
  writeU32(payload, o, fakeCount)
  writeU32(payload, o + 4, 0)
  return makeBox("ctts", payload, headerSize(ctts) === 16)
}
function patchSdtp(sdtp: Uint8Array, fakeCount: number): Uint8Array {
  const payload = new Uint8Array(sdtp.length - headerSize(sdtp) + fakeCount)
  payload.set(sdtp.slice(headerSize(sdtp)), 0)
  payload.fill(0x10, sdtp.length - headerSize(sdtp))
  return makeBox("sdtp", payload, headerSize(sdtp) === 16)
}
function patchStsz(stsz: Uint8Array, fakeCount: number): Uint8Array {
  const oldPayload = stsz.slice(headerSize(stsz))
  const payload = new Uint8Array(oldPayload.length + fakeCount * 4)
  payload.set(oldPayload, 0)
  const oldCount = readU32(stsz, 16)
  writeU32(payload, 8, oldCount + fakeCount)
  let o = oldPayload.length
  for (let i = 0; i < fakeCount; i++, o += 4) writeU32(payload, o, 8)
  return makeBox("stsz", payload, headerSize(stsz) === 16)
}
function patchStsc(stsc: Uint8Array, firstChunk: number, descId: number): Uint8Array {
  const oldPayload = stsc.slice(headerSize(stsc))
  const payload = new Uint8Array(oldPayload.length + 12)
  payload.set(oldPayload, 0)
  const n = readU32(stsc, 12)
  writeU32(payload, 4, n + 1)
  const o = oldPayload.length
  writeU32(payload, o, firstChunk)
  writeU32(payload, o + 4, 1)
  writeU32(payload, o + 8, descId)
  return makeBox("stsc", payload, headerSize(stsc) === 16)
}
function patchChunkOffsets(
  stco: Uint8Array,
  shift: number,
  appendOffsetOrNull: number | null,
  repeatCount = 1,
): Uint8Array {
  const t = boxType(stco)
  const oldPayload = stco.slice(headerSize(stco))
  const step = t === "co64" ? 8 : 4
  const oldCount = readU32(stco, 12)
  const add = appendOffsetOrNull == null ? 0 : repeatCount
  const payload = new Uint8Array(oldPayload.length + add * step)
  payload.set(oldPayload, 0)
  writeU32(payload, 4, oldCount + add)
  for (let i = 0; i < oldCount; i++) {
    const po = 8 + i * step
    const old = step === 8 ? readU64(stco, headerSize(stco) + po) : readU32(stco, headerSize(stco) + po)
    const val = old + shift
    if (step === 8) writeU64(payload, po, val)
    else writeU32(payload, po, val)
  }
  for (let i = 0; i < add; i++) {
    const po = 8 + (oldCount + i) * step
    if (step === 8) writeU64(payload, po, appendOffsetOrNull as number)
    else writeU32(payload, po, appendOffsetOrNull as number)
  }
  return makeBox(t, payload, headerSize(stco) === 16)
}

function buildPatchedMoov(
  moov: Uint8Array,
  info: MoovInfo,
  shiftExistingOffsets: number,
  fakeChunkOffset: number,
): Uint8Array {
  function rebuildStbl(stbl: Uint8Array, isVideo: boolean): Uint8Array {
    return rebuildContainer(stbl, (child, t) => {
      if (t === "stco" || t === "co64")
        return patchChunkOffsets(child, shiftExistingOffsets, isVideo ? fakeChunkOffset : null, isVideo ? info.fakeCount : 1)
      if (!isVideo) return child
      if (t === "stts") return patchStts(child, info.fakeCount, info.video.stts.primaryDelta)
      if (t === "ctts") return patchCtts(child, info.fakeCount)
      if (t === "sdtp") return patchSdtp(child, info.fakeCount)
      if (t === "stsz") return patchStsz(child, info.fakeCount)
      if (t === "stsc") return patchStsc(child, info.video.chunks.count + 1, info.video.stsc.lastDescId)
      return child
    })
  }
  function rebuildMinf(minf: Uint8Array, isVideo: boolean): Uint8Array {
    return rebuildContainer(minf, (child, t) => (t === "stbl" ? rebuildStbl(child, isVideo) : child))
  }
  function rebuildMdia(mdia: Uint8Array, isVideo: boolean): Uint8Array {
    return rebuildContainer(mdia, (child, t) => {
      if (t === "minf") return rebuildMinf(child, isVideo)
      return child
    })
  }
  function rebuildTrak(trak: Uint8Array): Uint8Array {
    const isVideo = handlerType(trak) === "vide"
    return rebuildContainer(trak, (child, t) => {
      if (t === "mdia") return rebuildMdia(child, isVideo)
      return child
    })
  }
  return rebuildContainer(moov, (child, t) => {
    if (t === "trak") return rebuildTrak(child)
    return child
  })
}

function makeFakeData(): Uint8Array {
  return new Uint8Array(FAKE_SAMPLE)
}
function patchMdat(mdat: Uint8Array, fakeData: Uint8Array): Uint8Array {
  const h = headerSize(mdat)
  const oldSize = readU32(mdat, 0) === 1 ? readU64(mdat, 8) : readU32(mdat, 0)
  if (readU32(mdat, 0) === 0) throw new Error("mdat size=0 is not supported.")
  const newSize = oldSize + fakeData.length
  const out = new Uint8Array(mdat.length + fakeData.length)
  out.set(mdat, 0)
  out.set(fakeData, mdat.length)
  if (h === 16) {
    writeU64(out, 8, newSize)
  } else {
    if (newSize > U32_MAX) throw new Error("Patched mdat would exceed 4GB; this keeps 32-bit mdat boxes only.")
    writeU32(out, 0, newSize)
  }
  return out
}

function findTop(bytes: Uint8Array) {
  const boxes = parseBoxes(bytes, 0, bytes.length)
  const moov = boxes.find((b) => b.type === "moov")
  const mdat = boxes.find((b) => b.type === "mdat")
  if (!moov) throw new Error("No moov atom found.")
  if (!mdat) throw new Error("No mdat atom found.")
  return { boxes, moov, mdat }
}

export type PatchResult = {
  output: Uint8Array
  filename: string
  realSamples: number
  fakeSamples: number
  warningDetails: string[]
}

export function collectWarningDetails(file: File, info: MoovInfo | null = null): string[] {
  const details: string[] = []
  if (file && file.size > SIZE_WARNING_BYTES) details.push(`${fmtBytes(file.size)} file size`)
  if (info && info.video && info.video.tkhd) {
    const w = Math.round(info.video.tkhd.width || 0)
    const h = Math.round(info.video.tkhd.height || 0)
    const shortSide = Math.min(w, h)
    if (shortSide > 1080) details.push(`${w}x${h} resolution`)
  }
  if (info && info.frameRate && info.frameRate > 60.01) details.push(`${info.frameRate.toFixed(2)} FPS`)
  return details
}

export function buildEthicPatch(file: File, bytes: Uint8Array): PatchResult {
  const top = findTop(bytes)
  const moovBytes = bytes.slice(top.moov.start, top.moov.end)
  const mdatBytes = bytes.slice(top.mdat.start, top.mdat.end)
  const info = analyzeMoov(moovBytes)

  if (info.video.stsz.trailingEight >= 100 && info.video.stsz.trailingEight > info.video.stsz.sampleCount * 0.08) {
    throw new Error(
      `This file already looks patched (${info.video.stsz.trailingEight} trailing 8-byte samples). Use a clean export instead.`,
    )
  }

  const testMoov = buildPatchedMoov(moovBytes, info, 0, 0)
  const moovDelta = testMoov.length - moovBytes.length
  const moovBeforeMdat = top.moov.start < top.mdat.start
  const shiftExistingOffsets = moovBeforeMdat ? moovDelta : 0
  const oldMdatHeader = top.mdat.header
  const oldMdatDataSize = top.mdat.size - oldMdatHeader
  const newMdatStart = top.mdat.start + (moovBeforeMdat ? moovDelta : 0)
  const fakeChunkOffset = newMdatStart + oldMdatHeader + oldMdatDataSize
  const finalMoov = buildPatchedMoov(moovBytes, info, shiftExistingOffsets, fakeChunkOffset)
  const fakeData = makeFakeData()
  const finalMdat = patchMdat(mdatBytes, fakeData)

  const parts: Uint8Array[] = []
  for (const b of top.boxes) {
    if (b.type === "moov") parts.push(finalMoov)
    else if (b.type === "mdat") parts.push(finalMdat)
    else parts.push(bytes.slice(b.start, b.end))
  }

  const output = concat(parts)
  const originalName = file.name.replace(/\.[^/.]+$/, "")
  return {
    output,
    filename: `${originalName}patched.mp4`,
    realSamples: info.video.stsz.sampleCount,
    fakeSamples: info.fakeCount,
    warningDetails: collectWarningDetails(file, info),
  }
}
