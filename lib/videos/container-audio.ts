const HEAD_PROBE_BYTES = 4 * 1024 * 1024;
const TAIL_PROBE_BYTES = 16 * 1024 * 1024;

export const SOUNDTRACK_LOST_MESSAGE =
  "Could not keep this clip's sound while compressing.";

const AUDIO_SAMPLE_ENTRIES = new Set([
  "mp4a",
  "aac ",
  "sowt",
  "twos",
  "lpcm",
  "in24",
  "in32",
  "fl32",
  "fl64",
  "alac",
  "opus",
  "Opus",
  "fLaC",
  "flac",
  ".mp3",
  "samr",
  "sawb",
  "ac-3",
  "ec-3",
  "apac",
]);

type ContainerScan = {
  sawAudio: boolean;
  sawVideo: boolean;
};

function includesAscii(bytes: Uint8Array, needle: string): boolean {
  const pattern = Array.from(needle, (char) => char.charCodeAt(0));
  if (pattern.length === 0 || bytes.length < pattern.length) return false;

  outer: for (let index = 0; index <= bytes.length - pattern.length; index += 1) {
    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (bytes[index + offset] !== pattern[offset]) continue outer;
    }
    return true;
  }
  return false;
}

/** Read ISO-BMFF handler types and WebM codec ids from one slice of the file. */
function scanContainer(bytes: Uint8Array): ContainerScan {
  let sawAudio = false;
  let sawVideo = false;

  for (let index = 4; index + 16 <= bytes.length; index += 1) {
    if (
      bytes[index] !== 0x68 ||
      bytes[index + 1] !== 0x64 ||
      bytes[index + 2] !== 0x6c ||
      bytes[index + 3] !== 0x72
    ) {
      continue;
    }
    const handler = String.fromCharCode(
      bytes[index + 12],
      bytes[index + 13],
      bytes[index + 14],
      bytes[index + 15],
    );
    if (handler === "soun") sawAudio = true;
    if (handler === "vide") sawVideo = true;
  }

  if (
    includesAscii(bytes, "A_OPUS") ||
    includesAscii(bytes, "A_VORBIS") ||
    includesAscii(bytes, "A_AAC") ||
    includesAscii(bytes, "OpusHead")
  ) {
    sawAudio = true;
  }
  if (
    includesAscii(bytes, "V_VP8") ||
    includesAscii(bytes, "V_VP9") ||
    includesAscii(bytes, "V_AV1")
  ) {
    sawVideo = true;
  }

  if (scanSampleEntries(bytes)) sawAudio = true;

  return { sawAudio, sawVideo };
}

function fourcc(bytes: Uint8Array, offset: number): string {
  if (offset < 0 || offset + 4 > bytes.length) return "";
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

function readUint32(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
}

/** Audio sample entries live in `stsd`, even when the handler box was missed. */
function scanSampleEntries(bytes: Uint8Array): boolean {
  for (let index = 0; index + 16 <= bytes.length; index += 1) {
    if (fourcc(bytes, index) !== "stsd") continue;
    const entryCount = readUint32(bytes, index + 8);
    if (entryCount === null || entryCount < 1 || entryCount > 8) continue;

    let cursor = index + 12;
    for (let entry = 0; entry < entryCount; entry += 1) {
      const size = readUint32(bytes, cursor);
      if (size === null || size < 8 || cursor + size > bytes.length) break;
      if (AUDIO_SAMPLE_ENTRIES.has(fourcc(bytes, cursor + 4))) return true;
      cursor += size;
    }
  }
  return false;
}

function mergeScan(left: ContainerScan, right: ContainerScan): ContainerScan {
  return {
    sawAudio: left.sawAudio || right.sawAudio,
    sawVideo: left.sawVideo || right.sawVideo,
  };
}

async function readSlice(file: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

/**
 * True when the container has an audio track, false when it only has video,
 * and null when the header was not in the probed slices.
 */
export async function containerHasAudio(file: Blob): Promise<boolean | null> {
  if (file.size <= 0) return null;

  const headSize = Math.min(file.size, HEAD_PROBE_BYTES);
  let scan = scanContainer(await readSlice(file, 0, headSize));
  if (file.size > headSize) {
    const tailStart = Math.max(headSize, file.size - TAIL_PROBE_BYTES);
    scan = mergeScan(scan, scanContainer(await readSlice(file, tailStart, file.size)));
  }

  if (scan.sawAudio) return true;
  if (scan.sawVideo) return false;
  return null;
}
