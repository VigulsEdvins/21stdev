/**
 * Zip writer and local-asset helpers for the assembler: a pure JavaScript ZIP (STORE, no compression) with its CRC-32,
 * and the functions that find and rewrite root-relative asset URLs so an export can bundle the files.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 */
(function () {
  /**
   * Precomputed CRC-32 lookup table for fast ZIP checksum calculations.
   */
  const CRC32_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC32_TABLE[n] = c;
  }

  function calculateCrc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function stringToUint8(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8');
    }
    const utf8 = unescape(encodeURIComponent(str));
    const result = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) {
      result[i] = utf8.charCodeAt(i);
    }
    return result;
  }

  function putU16(buffer, offset, val) {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
  }

  function putU32(buffer, offset, val) {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
    buffer[offset + 2] = (val >> 16) & 0xff;
    buffer[offset + 3] = (val >> 24) & 0xff;
  }

  /**
   * Root-relative local asset references (e.g. "/site-b/assets/images/a.jpg") only resolve on the
   * builder's dev server. These helpers find them so export can bundle or inline the files.
   */
  const LOCAL_ASSET_RE = /(["'(=,\s])(\/(?!\/)[A-Za-z0-9_\-.%~@+\/]+\.(?:png|jpe?g|webp|gif|svg|avif|ico|mp4|webm|mp3|wav|ogg|woff2?|ttf|otf|css))(?=[?#"')\s>,]|$)/gi;

  function findLocalAssetUrls(text) {
    const found = new Set();
    if (typeof text !== 'string') return [];
    for (const m of text.matchAll(LOCAL_ASSET_RE)) found.add(m[2]);
    return Array.from(found);
  }

  function rewriteLocalAssetUrls(text, urlMap) {
    if (typeof text !== 'string' || !urlMap) return text;
    return text.replace(LOCAL_ASSET_RE, (full, pre, url) =>
      Object.prototype.hasOwnProperty.call(urlMap, url) ? pre + urlMap[url] : full);
  }

  /**
   * Pure JavaScript ZIP archive generator (standard PKZIP 2.0 uncompressed STORE format).
   * Bundles files into a clean valid zip archive with zero third-party dependencies.
   * @param {Record<string, string|Uint8Array>} files - Map of filename to text or binary content
   * @returns {Buffer|Uint8Array} Binary archive buffer
   */
  function createZipArchive(files) {
    const entries = Object.entries(files).map(([name, content]) => {
      const nameBytes = stringToUint8(name);
      let contentBytes;
      if (typeof content === 'string') {
        contentBytes = stringToUint8(content);
      } else if (content instanceof Uint8Array) {
        contentBytes = content;
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
        contentBytes = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
      } else {
        contentBytes = stringToUint8(String(content));
      }
      return {
        name,
        nameBytes,
        contentBytes,
        crc: calculateCrc32(contentBytes)
      };
    });

    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    const localParts = [];
    const cdParts = [];
    let currentOffset = 0;

    for (const entry of entries) {
      // 1. Local File Header (30 bytes + name length)
      const localHeader = new Uint8Array(30 + entry.nameBytes.length);
      putU32(localHeader, 0, 0x04034b50); // Local header signature: PK\x03\x04
      putU16(localHeader, 4, 20);         // Version needed: 2.0
      putU16(localHeader, 6, 0x0800);     // General purpose flags: UTF-8 (bit 11)
      putU16(localHeader, 8, 0);          // Compression method: 0 (STORE)
      putU16(localHeader, 10, dosTime);
      putU16(localHeader, 12, dosDate);
      putU32(localHeader, 14, entry.crc);
      putU32(localHeader, 18, entry.contentBytes.length); // Compressed size
      putU32(localHeader, 22, entry.contentBytes.length); // Uncompressed size
      putU16(localHeader, 26, entry.nameBytes.length);
      putU16(localHeader, 28, 0);         // Extra field length
      localHeader.set(entry.nameBytes, 30);

      // 2. Central Directory Header (46 bytes + name length)
      const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
      putU32(cdHeader, 0, 0x02014b50);    // Central dir signature: PK\x01\x02
      putU16(cdHeader, 4, 20);            // Version made by: 2.0
      putU16(cdHeader, 6, 20);            // Version needed: 2.0
      putU16(cdHeader, 8, 0x0800);        // General purpose flags: UTF-8
      putU16(cdHeader, 10, 0);            // Compression: STORE
      putU16(cdHeader, 12, dosTime);
      putU16(cdHeader, 14, dosDate);
      putU32(cdHeader, 16, entry.crc);
      putU32(cdHeader, 20, entry.contentBytes.length);
      putU32(cdHeader, 24, entry.contentBytes.length);
      putU16(cdHeader, 28, entry.nameBytes.length);
      putU16(cdHeader, 30, 0);            // Extra field length
      putU16(cdHeader, 32, 0);            // Comment length
      putU16(cdHeader, 34, 0);            // Disk number start
      putU16(cdHeader, 36, 0);            // Internal file attributes
      putU32(cdHeader, 38, 0);            // External file attributes
      putU32(cdHeader, 42, currentOffset);// Relative offset of local header
      cdHeader.set(entry.nameBytes, 46);

      localParts.push(localHeader, entry.contentBytes);
      cdParts.push(cdHeader);
      currentOffset += localHeader.length + entry.contentBytes.length;
    }

    const cdOffset = currentOffset;
    let cdSize = 0;
    for (const part of cdParts) {
      cdSize += part.length;
    }

    // 3. End of Central Directory (EOCD) record (22 bytes)
    const eocd = new Uint8Array(22);
    putU32(eocd, 0, 0x06054b50);         // EOCD signature: PK\x05\x06
    putU16(eocd, 4, 0);                  // Disk number
    putU16(eocd, 6, 0);                  // Disk with start of CD
    putU16(eocd, 8, entries.length);     // Entries on this disk
    putU16(eocd, 10, entries.length);    // Total entries
    putU32(eocd, 12, cdSize);            // Size of CD
    putU32(eocd, 16, cdOffset);          // Offset of CD
    putU16(eocd, 20, 0);                 // Comment length

    const totalLength = currentOffset + cdSize + 22;
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const part of localParts) {
      result.set(part, pos);
      pos += part.length;
    }
    for (const part of cdParts) {
      result.set(part, pos);
      pos += part.length;
    }
    result.set(eocd, pos);

    if (typeof Buffer !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
      return Buffer.from(result.buffer, result.byteOffset, result.byteLength);
    }
    return result;
  }

  const api = { findLocalAssetUrls, rewriteLocalAssetUrls, createZipArchive, LOCAL_ASSET_RE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AsmZip = api;
})();
