export type SupportedImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };

export function detectImage(bytes: Buffer): SupportedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export function stripImageMetadata(bytes: Buffer, image: SupportedImage) {
  if (image.extension === "jpg") return stripJpegMetadata(bytes);
  if (image.extension === "png") return stripPngMetadata(bytes);
  return stripWebpMetadata(bytes);
}

export function getImageDimensions(bytes: Buffer, image: SupportedImage) {
  if (image.extension === "png") {
    if (bytes.length < 24) return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (image.extension === "jpg") return jpegDimensions(bytes);
  return webpDimensions(bytes);
}

function stripJpegMetadata(input: Buffer) {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) throw new Error("Invalid JPEG image");
  const chunks: Buffer[] = [input.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= input.length) {
    if (input[offset] !== 0xff) throw new Error("Invalid JPEG marker sequence");
    let markerOffset = offset;
    while (input[markerOffset] === 0xff) markerOffset++;
    const marker = input[markerOffset];
    if (marker === undefined) break;
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(input.subarray(offset));
      return Buffer.concat(chunks);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(input.subarray(offset, markerOffset + 1));
      offset = markerOffset + 1;
      continue;
    }
    if (markerOffset + 3 >= input.length) throw new Error("Invalid JPEG segment");
    const segmentLength = input.readUInt16BE(markerOffset + 1);
    const end = markerOffset + 1 + segmentLength;
    if (segmentLength < 2 || end > input.length) throw new Error("Invalid JPEG segment length");
    // APP1 (EXIF/XMP) and APP13 (IPTC) can contain location and personal metadata.
    if (marker !== 0xe1 && marker !== 0xed) chunks.push(input.subarray(offset, end));
    offset = end;
  }
  throw new Error("JPEG image is incomplete");
}

function stripPngMetadata(input: Buffer) {
  const signature = input.subarray(0, 8);
  if (signature.length !== 8) throw new Error("Invalid PNG image");
  const chunks: Buffer[] = [signature];
  let offset = 8;
  let foundEnd = false;
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > input.length) throw new Error("Invalid PNG chunk length");
    const type = input.toString("ascii", offset + 4, offset + 8);
    if (!["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) chunks.push(input.subarray(offset, end));
    offset = end;
    if (type === "IEND") { foundEnd = true; break; }
  }
  if (!foundEnd) throw new Error("PNG image is incomplete");
  return Buffer.concat(chunks);
}

function stripWebpMetadata(input: Buffer) {
  if (input.length < 20) throw new Error("Invalid WebP image");
  const chunks: Buffer[] = [];
  let offset = 12;
  while (offset + 8 <= input.length) {
    const type = input.toString("ascii", offset, offset + 4);
    const length = input.readUInt32LE(offset + 4);
    const end = offset + 8 + length + (length % 2);
    if (end > input.length) throw new Error("Invalid WebP chunk length");
    if (type !== "EXIF" && type !== "XMP ") chunks.push(input.subarray(offset, end));
    offset = end;
  }
  if (offset !== input.length) throw new Error("WebP image is incomplete");
  const body = Buffer.concat(chunks);
  const header = Buffer.from("RIFF", "ascii");
  const size = Buffer.alloc(4);
  size.writeUInt32LE(body.length + 4, 0);
  return Buffer.concat([header, size, Buffer.from("WEBP", "ascii"), body]);
}

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === undefined || offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Buffer) {
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + size > bytes.length) return null;
    if (type === "VP8X" && size >= 10) {
      const width = 1 + bytes.readUIntLE(data + 4, 3);
      const height = 1 + bytes.readUIntLE(data + 7, 3);
      return { width, height };
    }
    if (type === "VP8 " && size >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      return { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
    }
    if (type === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const width = 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8);
      const height = 1 + ((bytes[data + 2] >> 6) & 0x03) + (bytes[data + 3] << 2) + ((bytes[data + 4] & 0x0f) << 10);
      return { width, height };
    }
    offset = data + size + (size % 2);
  }
  return null;
}
