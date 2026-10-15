// MOBI/AZW3 parser — ported from foliate-js (MIT, Copyright (c) 2022 John
// Factotum) — mobi.js@1.0.1; adapted to our book model.
//
// The parsing core is a faithful port: PDB header/records (:16-21, :486-509),
// PalmDOC decompression (:229-253), MOBI/PalmDOC/EXTH headers (:23-140),
// HUFFCDIC decompression (:255-327), INDX index parsing (:329-415), KF8
// skeleton/fragment handling (:941-1238) and MOBI6 filepos handling
// (:670-895). The OUTPUT side is adapted to our pipeline's book shape
// (sections.js `createBook`): `parseMobi(bytes, { unzlib })` returns
// `{sections, metadata, toc, dir, rendition, transformTarget, destroy}`
// where sections carry `load()/unload()/createDocument()/size/linear` and
// blob URLs are issued through our refcounted resource cache (resources.js)
// so engine destroy() revokes everything.
//
// Documented deviations from foliate:
// - input is a Uint8Array/ArrayBuffer already in memory (not a lazy File),
//   so PDB.loadRecord is synchronous.
// - `unescapeHTML` falls back to a regex/entity-map decoder when no `document`
//   exists (Node unit tests parse without a DOM).
// - KF8 RESC parsing (page-spread hints) is best-effort try/catch — no
//   DOMParser in Node; the hint is cosmetic, never load-bearing.
// - `resolveTOCHref` is a synchronous best-effort (foliate's KF8
//   resolveHref can load raw records to recover an unknown fragment
//   selector; we fall back to the section start instead).
// - MOBI6 TOC labels use `textContent` (foliate uses `innerText`, which is
//   just textContent on non-rendered parsed documents anyway).

import { createResourceCache } from "./resources.js";
import { cssIntake } from "./rewriter.js";

const MIME = {
  XML: "application/xml",
  XHTML: "application/xhtml+xml",
  HTML: "text/html",
  CSS: "text/css",
  SVG: "image/svg+xml",
};

const PDB_HEADER = {
  name: [0, 32, "string"],
  type: [60, 4, "string"],
  creator: [64, 4, "string"],
  numRecords: [76, 2, "uint"],
};

const PALMDOC_HEADER = {
  compression: [0, 2, "uint"],
  numTextRecords: [8, 2, "uint"],
  recordSize: [10, 2, "uint"],
  encryption: [12, 2, "uint"],
};

const MOBI_HEADER = {
  magic: [16, 4, "string"],
  length: [20, 4, "uint"],
  type: [24, 4, "uint"],
  encoding: [28, 4, "uint"],
  uid: [32, 4, "uint"],
  version: [36, 4, "uint"],
  titleOffset: [84, 4, "uint"],
  titleLength: [88, 4, "uint"],
  localeRegion: [94, 1, "uint"],
  localeLanguage: [95, 1, "uint"],
  resourceStart: [108, 4, "uint"],
  huffcdic: [112, 4, "uint"],
  numHuffcdic: [116, 4, "uint"],
  exthFlag: [128, 4, "uint"],
  trailingFlags: [240, 4, "uint"],
  indx: [244, 4, "uint"],
};

const KF8_HEADER = {
  resourceStart: [108, 4, "uint"],
  fdst: [192, 4, "uint"],
  numFdst: [196, 4, "uint"],
  frag: [248, 4, "uint"],
  skel: [252, 4, "uint"],
  guide: [260, 4, "uint"],
};

const EXTH_HEADER = {
  magic: [0, 4, "string"],
  length: [4, 4, "uint"],
  count: [8, 4, "uint"],
};

const INDX_HEADER = {
  magic: [0, 4, "string"],
  length: [4, 4, "uint"],
  type: [8, 4, "uint"],
  idxt: [20, 4, "uint"],
  numRecords: [24, 4, "uint"],
  encoding: [28, 4, "uint"],
  language: [32, 4, "uint"],
  total: [36, 4, "uint"],
  ordt: [40, 4, "uint"],
  ligt: [44, 4, "uint"],
  numLigt: [48, 4, "uint"],
  numCncx: [52, 4, "uint"],
};

const TAGX_HEADER = {
  magic: [0, 4, "string"],
  length: [4, 4, "uint"],
  numControlBytes: [8, 4, "uint"],
};

const HUFF_HEADER = {
  magic: [0, 4, "string"],
  offset1: [8, 4, "uint"],
  offset2: [12, 4, "uint"],
};

const CDIC_HEADER = {
  magic: [0, 4, "string"],
  length: [4, 4, "uint"],
  numEntries: [8, 4, "uint"],
  codeLength: [12, 4, "uint"],
};

const FDST_HEADER = {
  magic: [0, 4, "string"],
  numEntries: [8, 4, "uint"],
};

const FONT_HEADER = {
  flags: [8, 4, "uint"],
  dataStart: [12, 4, "uint"],
  keyLength: [16, 4, "uint"],
  keyStart: [20, 4, "uint"],
};

const MOBI_ENCODING = {
  1252: "windows-1252",
  65001: "utf-8",
};

const EXTH_RECORD_TYPE = {
  100: ["creator", "string", true],
  101: ["publisher"],
  103: ["description"],
  104: ["isbn"],
  105: ["subject", "string", true],
  106: ["date"],
  108: ["contributor", "string", true],
  109: ["rights"],
  110: ["subjectCode", "string", true],
  112: ["source", "string", true],
  113: ["asin"],
  121: ["boundary", "uint"],
  122: ["fixedLayout"],
  125: ["numResources", "uint"],
  126: ["originalResolution"],
  127: ["zeroGutter"],
  128: ["zeroMargin"],
  129: ["coverURI"],
  132: ["regionMagnification"],
  201: ["coverOffset", "uint"],
  202: ["thumbnailOffset", "uint"],
  503: ["title"],
  524: ["language", "string", true],
  527: ["pageProgressionDirection"],
};

const MOBI_LANG = {
  1: [
    "ar",
    "ar-SA",
    "ar-IQ",
    "ar-EG",
    "ar-LY",
    "ar-DZ",
    "ar-MA",
    "ar-TN",
    "ar-OM",
    "ar-YE",
    "ar-SY",
    "ar-JO",
    "ar-LB",
    "ar-KW",
    "ar-AE",
    "ar-BH",
    "ar-QA",
  ],
  2: ["bg"],
  3: ["ca"],
  4: ["zh", "zh-TW", "zh-CN", "zh-HK", "zh-SG"],
  5: ["cs"],
  6: ["da"],
  7: ["de", "de-DE", "de-CH", "de-AT", "de-LU", "de-LI"],
  8: ["el"],
  9: [
    "en",
    "en-US",
    "en-GB",
    "en-AU",
    "en-CA",
    "en-NZ",
    "en-IE",
    "en-ZA",
    "en-JM",
    null,
    "en-BZ",
    "en-TT",
    "en-ZW",
    "en-PH",
  ],
  10: [
    "es",
    "es-ES",
    "es-MX",
    null,
    "es-GT",
    "es-CR",
    "es-PA",
    "es-DO",
    "es-VE",
    "es-CO",
    "es-PE",
    "es-AR",
    "es-EC",
    "es-CL",
    "es-UY",
    "es-PY",
    "es-BO",
    "es-SV",
    "es-HN",
    "es-NI",
    "es-PR",
  ],
  11: ["fi"],
  12: ["fr", "fr-FR", "fr-BE", "fr-CA", "fr-CH", "fr-LU", "fr-MC"],
  13: ["he"],
  14: ["hu"],
  15: ["is"],
  16: ["it", "it-IT", "it-CH"],
  17: ["ja"],
  18: ["ko"],
  19: ["nl", "nl-NL", "nl-BE"],
  20: ["no", "nb", "nn"],
  21: ["pl"],
  22: ["pt", "pt-BR", "pt-PT"],
  23: ["rm"],
  24: ["ro"],
  25: ["ru"],
  26: ["hr", null, "sr"],
  27: ["sk"],
  28: ["sq"],
  29: ["sv", "sv-SE", "sv-FI"],
  30: ["th"],
  31: ["tr"],
  32: ["ur"],
  33: ["id"],
  34: ["uk"],
  35: ["be"],
  36: ["sl"],
  37: ["et"],
  38: ["lv"],
  39: ["lt"],
  41: ["fa"],
  42: ["vi"],
  43: ["hy"],
  44: ["az"],
  45: ["eu"],
  46: ["hsb"],
  47: ["mk"],
  48: ["st"],
  49: ["ts"],
  50: ["tn"],
  52: ["xh"],
  53: ["zu"],
  54: ["af"],
  55: ["ka"],
  56: ["fo"],
  57: ["hi"],
  58: ["mt"],
  59: ["se"],
  62: ["ms"],
  63: ["kk"],
  65: ["sw"],
  67: ["uz", null, "uz-UZ"],
  68: ["tt"],
  69: ["bn"],
  70: ["pa"],
  71: ["gu"],
  72: ["or"],
  73: ["ta"],
  74: ["te"],
  75: ["kn"],
  76: ["ml"],
  77: ["as"],
  78: ["mr"],
  79: ["sa"],
  82: ["cy", "cy-GB"],
  83: ["gl", "gl-ES"],
  87: ["kok"],
  97: ["ne"],
  98: ["fy"],
};

const concatTypedArray = (a, b) => {
  const result = new a.constructor(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
};
const concatTypedArray3 = (a, b, c) => {
  const result = new a.constructor(a.length + b.length + c.length);
  result.set(a);
  result.set(b, a.length);
  result.set(c, a.length + b.length);
  return result;
};

const decoder = new TextDecoder();
const getString = (buffer) => decoder.decode(buffer);
const getUint = (buffer) => {
  if (!buffer) return;
  const l = buffer.byteLength;
  const func = l === 4 ? "getUint32" : l === 2 ? "getUint16" : "getUint8";
  return new DataView(buffer)[func](0);
};
const getStruct = (def, buffer) =>
  Object.fromEntries(
    Array.from(Object.entries(def)).map(([key, [start, len, type]]) => [
      key,
      (type === "string" ? getString : getUint)(buffer.slice(start, start + len)),
    ])
  );

const getDecoder = (x) => new TextDecoder(MOBI_ENCODING[x]);

const getVarLen = (byteArray, i = 0) => {
  let value = 0;
  let length = 0;
  for (const byte of byteArray.subarray(i, i + 4)) {
    value = ((value << 7) | (byte & 0b111_1111)) >>> 0;
    length++;
    if (byte & 0b1000_0000) break;
  }
  return { value, length };
};

// variable-length quantity, but read from the end of data
const getVarLenFromEnd = (byteArray) => {
  let value = 0;
  for (const byte of byteArray.subarray(-4)) {
    // `byte & 0b1000_0000` indicates the start of value
    if (byte & 0b1000_0000) value = 0;
    value = (value << 7) | (byte & 0b111_1111);
  }
  return value;
};

const countBitsSet = (x) => {
  let count = 0;
  for (; x > 0; x = x >> 1) if ((x & 1) === 1) count++;
  return count;
};

const countUnsetEnd = (x) => {
  let count = 0;
  while ((x & 1) === 0) {
    x = x >> 1;
    count++;
  }
  return count;
};

const decompressPalmDOC = (array) => {
  const output = [];
  for (let i = 0; i < array.length; i++) {
    const byte = array[i];
    if (byte === 0) output.push(0);
    // uncompressed literal, just copy it
    else if (byte <= 8) {
      // copy next 1-8 bytes
      for (const x of array.subarray(i + 1, (i += byte) + 1)) output.push(x);
    } else if (byte <= 0b0111_1111) output.push(byte); // uncompressed literal
    else if (byte <= 0b1011_1111) {
      // 1st and 2nd bits are 10, meaning this is a length-distance pair
      // read next byte and combine it with current byte
      const bytes = (byte << 8) | array[i++ + 1];
      // the 3rd to 13th bits encode distance
      const distance = (bytes & 0b0011_1111_1111_1111) >>> 3;
      // the last 3 bits, plus 3, is the length to copy
      const length = (bytes & 0b111) + 3;
      for (let j = 0; j < length; j++) output.push(output[output.length - distance]);
    }
    // compressed from space plus char
    else output.push(32, byte ^ 0b1000_0000);
  }
  return Uint8Array.from(output);
};

const read32Bits = (byteArray, from) => {
  const startByte = from >> 3;
  const end = from + 32;
  const endByte = end >> 3;
  let bits = 0n;
  for (let i = startByte; i <= endByte; i++) bits = (bits << 8n) | BigInt(byteArray[i] ?? 0);
  return (bits >> (8n - BigInt(end & 7))) & 0xffffffffn;
};

// foliate mobi.js:461-479 — font deobfuscation/decompression
const getFont = (buf, unzlib) => {
  const { flags, dataStart, keyLength, keyStart } = getStruct(FONT_HEADER, buf);
  const array = new Uint8Array(buf.slice(dataStart));
  // deobfuscate font
  if (flags & 0b10) {
    const bytes = keyLength === 16 ? 1024 : 1040;
    const key = new Uint8Array(buf.slice(keyStart, keyStart + keyLength));
    const length = Math.min(bytes, array.length);
    for (let i = 0; i < length; i++) array[i] = array[i] ^ key[i % key.length];
  }
  // decompress font
  if (flags & 1) {
    try {
      return unzlib(array);
    } catch (e) {
      console.warn(e);
      console.warn("Failed to decompress font");
    }
  }
  return array;
};

const huffcdic = (mobi) => {
  const huffRecord = mobi.loadRecord(mobi.headers.mobi.huffcdic);
  const { magic, offset1, offset2 } = getStruct(HUFF_HEADER, huffRecord);
  if (magic !== "HUFF") throw new Error("Invalid HUFF record");

  // table1 is indexed by byte value
  const table1 = Array.from({ length: 256 }, (_, i) => offset1 + i * 4)
    .map((offset) => getUint(huffRecord.slice(offset, offset + 4)))
    .map((x) => [x & 0b1000_0000, x & 0b1_1111, x >>> 8]);

  // table2 is indexed by code length
  const table2 = [null].concat(
    Array.from({ length: 32 }, (_, i) => offset2 + i * 8).map((offset) => [
      getUint(huffRecord.slice(offset, offset + 4)),
      getUint(huffRecord.slice(offset + 4, offset + 8)),
    ])
  );

  const dictionary = [];
  for (let i = 1; i < mobi.headers.mobi.numHuffcdic; i++) {
    const record = mobi.loadRecord(mobi.headers.mobi.huffcdic + i);
    const cdic = getStruct(CDIC_HEADER, record);
    if (cdic.magic !== "CDIC") throw new Error("Invalid CDIC record");
    // `numEntries` is the total number of dictionary data across CDIC records
    // so `n` here is the number of entries in *this* record
    const n = Math.min(1 << cdic.codeLength, cdic.numEntries - dictionary.length);
    const buffer = record.slice(cdic.length);
    for (let i = 0; i < n; i++) {
      const offset = getUint(buffer.slice(i * 2, i * 2 + 2));
      const x = getUint(buffer.slice(offset, offset + 2));
      const length = x & 0x7fff;
      const decompressed = x & 0x8000;
      const value = new Uint8Array(buffer.slice(offset + 2, offset + 2 + length));
      dictionary.push([value, decompressed]);
    }
  }

  const decompress = (byteArray) => {
    let output = new Uint8Array();
    const bitLength = byteArray.byteLength * 8;
    for (let i = 0; i < bitLength; ) {
      const bits = Number(read32Bits(byteArray, i));
      let [found, codeLength, value] = table1[bits >>> 24];
      if (!found) {
        while (bits >>> (32 - codeLength) < table2[codeLength][0]) codeLength += 1;
        value = table2[codeLength][1];
      }
      if ((i += codeLength) > bitLength) break;

      const code = value - (bits >>> (32 - codeLength));
      let [result, decompressedFlag] = dictionary[code];
      if (!decompressedFlag) {
        // the result is itself compressed
        result = decompress(result);
        // cache the result for next time
        dictionary[code] = [result, true];
      }
      output = concatTypedArray(output, result);
    }
    return output;
  };
  return decompress;
};

// foliate mobi.js:329-415 — INDX index parsing (TOC/skeleton/fragment tables)
const getIndexData = (indxIndex, loadRecord) => {
  const indxRecord = loadRecord(indxIndex);
  const indx = getStruct(INDX_HEADER, indxRecord);
  if (indx.magic !== "INDX") throw new Error("Invalid INDX record");
  const indexDecoder = getDecoder(indx.encoding);

  const tagxBuffer = indxRecord.slice(indx.length);
  const tagx = getStruct(TAGX_HEADER, tagxBuffer);
  if (tagx.magic !== "TAGX") throw new Error("Invalid TAGX section");
  const numTags = (tagx.length - 12) / 4;
  const tagTable = Array.from(
    { length: numTags },
    (_, i) => new Uint8Array(tagxBuffer.slice(12 + i * 4, 12 + i * 4 + 4))
  );

  const cncx = {};
  let cncxRecordOffset = 0;
  for (let i = 0; i < indx.numCncx; i++) {
    const record = loadRecord(indxIndex + indx.numRecords + i + 1);
    const array = new Uint8Array(record);
    for (let pos = 0; pos < array.byteLength; ) {
      const index = pos;
      const { value, length } = getVarLen(array, pos);
      pos += length;
      const result = record.slice(pos, pos + value);
      pos += value;
      cncx[cncxRecordOffset + index] = indexDecoder.decode(result);
    }
    cncxRecordOffset += 0x10000;
  }

  const table = [];
  for (let i = 0; i < indx.numRecords; i++) {
    const record = loadRecord(indxIndex + 1 + i);
    const array = new Uint8Array(record);
    const indxSub = getStruct(INDX_HEADER, record);
    if (indxSub.magic !== "INDX") throw new Error("Invalid INDX record");
    for (let j = 0; j < indxSub.numRecords; j++) {
      const offsetOffset = indxSub.idxt + 4 + 2 * j;
      const offset = getUint(record.slice(offsetOffset, offsetOffset + 2));

      const length = getUint(record.slice(offset, offset + 1));
      const name = getString(record.slice(offset + 1, offset + 1 + length));

      const tags = [];
      const startPos = offset + 1 + length;
      let controlByteIndex = 0;
      let pos = startPos + tagx.numControlBytes;
      for (const [tag, numValues, mask, end] of tagTable) {
        if (end & 1) {
          controlByteIndex++;
          continue;
        }
        const value =
          getUint(record.slice(startPos + controlByteIndex, startPos + controlByteIndex + 1)) &
          mask;
        if (value === mask) {
          if (countBitsSet(mask) > 1) {
            const { value, length } = getVarLen(array, pos);
            tags.push([tag, null, value, numValues]);
            pos += length;
          } else tags.push([tag, 1, null, numValues]);
        } else tags.push([tag, value >> countUnsetEnd(mask), null, numValues]);
      }

      const tagMap = {};
      for (const [tag, valueCount, valueBytes, numValues] of tags) {
        const values = [];
        if (valueCount != null) {
          for (let i = 0; i < valueCount * numValues; i++) {
            const { value, length } = getVarLen(array, pos);
            values.push(value);
            pos += length;
          }
        } else {
          let count = 0;
          while (count < valueBytes) {
            const { value, length } = getVarLen(array, pos);
            values.push(value);
            pos += length;
            count += length;
          }
        }
        tagMap[tag] = values;
      }
      table.push({ name, tagMap });
    }
  }
  return { table, cncx };
};

// foliate mobi.js:417-436 — the NCX (TOC tree) from the INDX records
const getNCX = (indxIndex, loadRecord) => {
  const { table, cncx } = getIndexData(indxIndex, loadRecord);
  const items = table.map(({ tagMap }, index) => ({
    index,
    offset: tagMap[1]?.[0],
    size: tagMap[2]?.[0],
    label: cncx[tagMap[3]] ?? "",
    headingLevel: tagMap[4]?.[0],
    pos: tagMap[6],
    parent: tagMap[21]?.[0],
    firstChild: tagMap[22]?.[0],
    lastChild: tagMap[23]?.[0],
  }));
  const getChildren = (item) => {
    if (item.firstChild == null) return item;
    item.children = items.filter((x) => x.parent === item.index).map(getChildren);
    return item;
  };
  return items.filter((item) => item.headingLevel === 0).map(getChildren);
};

// foliate mobi.js:438-459
const getEXTH = (buf, encoding) => {
  const { magic, count } = getStruct(EXTH_HEADER, buf);
  if (magic !== "EXTH") throw new Error("Invalid EXTH header");
  const exthDecoder = getDecoder(encoding);
  const results = {};
  let offset = 12;
  for (let i = 0; i < count; i++) {
    const type = getUint(buf.slice(offset, offset + 4));
    const length = getUint(buf.slice(offset + 4, offset + 8));
    if (type in EXTH_RECORD_TYPE) {
      const [name, typ, many] = EXTH_RECORD_TYPE[type];
      const data = buf.slice(offset + 8, offset + length);
      const value = typ === "uint" ? getUint(data) : exthDecoder.decode(data);
      if (many) {
        results[name] ??= [];
        results[name].push(value);
      } else results[name] = value;
    }
    offset += length;
  }
  return results;
};

// DOM-free fallback for environments without `document` (Node unit tests)
const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
};
const unescapeHTML = (str) => {
  if (!str) return "";
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
  }
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, entity) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[entity] ?? m;
  });
};

/**
 * Sniff the PDB type — foliate mobi.js:481-484 (`isMOBI`).
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {boolean}
 */
export function isMobi(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return getString(view.buffer.slice(view.byteOffset + 60, view.byteOffset + 68)) === "BOOKMOBI";
}

// foliate mobi.js:486-509 — PDB record table, over an in-memory buffer
class PDB {
  #buffer;
  #base;
  #offsets;
  pdb;
  open(array) {
    this.#buffer = array.buffer;
    this.#base = array.byteOffset;
    this.pdb = getStruct(PDB_HEADER, this.loadRecordBytes(0, 78));
    // record info entries live right after the 78-byte PDB header
    const buffer = this.loadRecordBytes(78, 78 + this.pdb.numRecords * 8);
    // get start and end offsets for each record
    this.#offsets = Array.from({ length: this.pdb.numRecords }, (_, i) =>
      getUint(buffer.slice(i * 8, i * 8 + 4))
    ).map((x, i, a) => [x, a[i + 1] ?? array.byteLength]);
    return this;
  }
  // absolute-record slice (byte range within the PDB stream)
  loadRecordBytes(start, end) {
    return this.#buffer.slice(this.#base + start, this.#base + end);
  }
  loadRecord(index) {
    const offsets = this.#offsets[index];
    if (!offsets) throw new RangeError("Record index out of bounds");
    return this.loadRecordBytes(...offsets);
  }
  loadMagic(index) {
    return getString(this.loadRecordBytes(this.#offsets[index][0], this.#offsets[index][0] + 4));
  }
}

// foliate mobi.js:511-642 — headers, decompressor setup, metadata
class MOBI extends PDB {
  #start = 0;
  #resourceStart;
  #decoder;
  #encoder;
  #decompress;
  #removeTrailingEntries;
  constructor({ unzlib }) {
    super();
    this.unzlib = unzlib;
  }
  open(array) {
    super.open(array);
    this.headers = this.#getHeaders(super.loadRecord(0));
    this.#resourceStart = this.headers.mobi.resourceStart;
    let isKF8 = this.headers.mobi.version >= 8;
    if (!isKF8) {
      const boundary = this.headers.exth?.boundary;
      if (boundary < 0xffffffff) {
        try {
          // it's a "combo" MOBI/KF8 file; try to open the KF8 part
          this.headers = this.#getHeaders(super.loadRecord(boundary));
          this.#start = boundary;
          isKF8 = true;
        } catch (e) {
          console.warn(e);
          console.warn("Failed to open KF8; falling back to MOBI");
        }
      }
    }
    this.#setup();
    return isKF8;
  }
  #getHeaders(buf) {
    const palmdoc = getStruct(PALMDOC_HEADER, buf);
    const mobi = getStruct(MOBI_HEADER, buf);
    if (mobi.magic !== "MOBI") throw new Error("Missing MOBI header");

    const { titleOffset, titleLength, localeLanguage, localeRegion } = mobi;
    mobi.title = buf.slice(titleOffset, titleOffset + titleLength);
    const lang = MOBI_LANG[localeLanguage];
    mobi.language = lang?.[localeRegion >> 2] ?? lang?.[0];

    const exth =
      mobi.exthFlag & 0b100_0000 ? getEXTH(buf.slice(mobi.length + 16), mobi.encoding) : null;
    const kf8 = mobi.version >= 8 ? getStruct(KF8_HEADER, buf) : null;
    return { palmdoc, mobi, exth, kf8 };
  }
  #setup() {
    const { palmdoc, mobi } = this.headers;
    this.#decoder = getDecoder(mobi.encoding);
    // `TextEncoder` only supports UTF-8
    // we are only encoding ASCII anyway, so I think it's fine
    this.#encoder = new TextEncoder();

    // set up decompressor
    const { compression } = palmdoc;
    this.#decompress =
      compression === 1
        ? (f) => f
        : compression === 2
        ? decompressPalmDOC
        : compression === 17480
        ? huffcdic(this)
        : null;
    if (!this.#decompress) throw new Error("Unknown compression type");

    // set up function for removing trailing bytes
    const { trailingFlags } = mobi;
    const multibyte = trailingFlags & 1;
    const numTrailingEntries = countBitsSet(trailingFlags >>> 1);
    this.#removeTrailingEntries = (array) => {
      for (let i = 0; i < numTrailingEntries; i++) {
        const length = getVarLenFromEnd(array);
        array = array.subarray(0, -length);
      }
      if (multibyte) {
        const length = (array[array.length - 1] & 0b11) + 1;
        array = array.subarray(0, -length);
      }
      return array;
    };
  }
  decode(...args) {
    return this.#decoder.decode(...args);
  }
  encode(...args) {
    return this.#encoder.encode(...args);
  }
  loadRecord(index) {
    return super.loadRecord(this.#start + index);
  }
  loadMagic(index) {
    return super.loadMagic(this.#start + index);
  }
  loadText(index) {
    return this.#decompress(
      this.#removeTrailingEntries(new Uint8Array(this.loadRecord(index + 1)))
    );
  }
  loadResource(index) {
    const buf = super.loadRecord(this.#resourceStart + index);
    const magic = getString(buf.slice(0, 4));
    if (magic === "FONT") return getFont(buf, this.unzlib);
    if (magic === "VIDE" || magic === "AUDI") return buf.slice(12);
    return buf;
  }
  getNCX() {
    const index = this.headers.mobi.indx;
    if (index < 0xffffffff) return getNCX(index, this.loadRecord.bind(this));
  }
  getMetadata() {
    const { mobi, exth } = this.headers;
    return {
      identifier: mobi.uid.toString(),
      title: unescapeHTML(exth?.title || this.decode(mobi.title)),
      author: exth?.creator?.map(unescapeHTML),
      publisher: unescapeHTML(exth?.publisher),
      language: exth?.language ?? mobi.language,
      published: exth?.date,
      description: unescapeHTML(exth?.description),
      subject: exth?.subject?.map(unescapeHTML),
      rights: unescapeHTML(exth?.rights),
      contributor: exth?.contributor,
    };
  }
  async getCover() {
    const { exth } = this.headers;
    const offset =
      exth?.coverOffset < 0xffffffff
        ? exth?.coverOffset
        : exth?.thumbnailOffset < 0xffffffff
        ? exth?.thumbnailOffset
        : null;
    if (offset != null) {
      const buf = await this.loadResource(offset);
      return new Blob([buf]);
    }
  }
}

const mbpPagebreakRegex = /<\s*(?:mbp:)?pagebreak[^>]*>/gi;
const fileposRegex = /<[^<>]+filepos=['"]{0,1}(\d+)[^<>]*>/gi;

// foliate mobi.js:647-659 — TOC indent heuristics for MOBI6 guide TOCs
const getIndent = (el) => {
  let x = 0;
  while (el) {
    const parent = el.parentElement;
    if (parent) {
      const tag = parent.tagName.toLowerCase();
      if (tag === "p") x += 1.5;
      else if (tag === "blockquote") x += 2;
    }
    el = parent;
  }
  return x;
};

// foliate mobi.js:661-668 — preserve every byte as a separate character so
// `filepos` byte offsets stay usable on the string
function rawBytesToString(uint8Array) {
  const chunkSize = 0x8000;
  let result = "";
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    result += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize));
  }
  return result;
}

// handlers for `kindle:` uris — foliate mobi.js:898-910
const kindleResourceRegex = /kindle:(flow|embed):(\w+)(?:\?mime=(\w+\/[-+.\w]+))?/;
const kindlePosRegex = /kindle:pos:fid:(\w+):off:(\w+)/;
const parseResourceURI = (str) => {
  const [resourceType, id, type] = str.match(kindleResourceRegex).slice(1);
  return { resourceType, id: parseInt(id, 32), type };
};
const parsePosURI = (str) => {
  const [fid, off] = str.match(kindlePosRegex).slice(1);
  return { fid: parseInt(fid, 32), off: parseInt(off, 32) };
};
const makePosURI = (fid = 0, off = 0) =>
  `kindle:pos:fid:${fid.toString(32).toUpperCase().padStart(4, "0")}:off:${off
    .toString(32)
    .toUpperCase()
    .padStart(10, "0")}`;

// `kindle:pos:` links are originally links that contain fragments identifiers
// so there should exist an element with `id` or `name`
// otherwise try to find one with an `aid` attribute
const getFragmentSelector = (str) => {
  const match = str.match(/\s(id|name|aid)\s*=\s*['"]([^'"]*)['"]/i);
  if (!match) return;
  const [, attr, value] = match;
  const escaped = typeof CSS !== "undefined" ? CSS.escape(value) : value;
  return `[${attr}="${escaped}"]`;
};

// replace asynchronously and sequentially — foliate mobi.js:923-929
const replaceSeries = async (str, regex, f) => {
  const matches = [];
  str.replace(regex, (...args) => (matches.push(args), null));
  const results = [];
  for (const args of matches) results.push(await f(...args));
  return str.replace(regex, () => results.shift());
};

// foliate mobi.js:670-895 — the MOBI6 (old-format) book, split along the
// worker seam: `prepareMOBI6` is the pure byte/regex half (runs in the
// worker — record decompression, the byte-per-char string, pagebreak
// splitting, filepos anchor insertion), `assembleMOBI6Book` is the
// DOM-flavored half (main thread — blob cache, DOMParser/XMLSerializer,
// guide TOC). `parseMobi` runs both locally; the worker backend feeds the
// same assembler through RPC-backed prepared objects.
const prepareMOBI6 = (mobi) => {
  const loadAllText = () => {
    const recordBuffers = [];
    for (let i = 0; i < mobi.headers.palmdoc.numTextRecords; i++) {
      recordBuffers.push(mobi.loadText(i));
    }
    const totalLength = recordBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    // load all text records in an array
    const array = new Uint8Array(totalLength);
    recordBuffers.reduce((offset, buf) => {
      array.set(new Uint8Array(buf), offset);
      return offset + buf.byteLength;
    }, 0);
    return array;
  };
  const array = loadAllText();
  // convert to string so we can use regex
  // note that `filepos` are byte offsets
  // so it needs to preserve each byte as a separate character
  const str = rawBytesToString(array);

  // split content into sections at each `<mbp:pagebreak>` — foliate :701-713
  const rawSections = [0]
    .concat(Array.from(str.matchAll(mbpPagebreakRegex), (m) => m.index))
    .map((start, i, a) => {
      const end = a[i + 1] ?? array.length;
      return { raw: array.subarray(start, end) };
    })
    // get start and end filepos for each section
    .map((section, i, arr) => {
      section.start = arr[i - 1]?.end ?? 0;
      section.end = section.start + section.raw.byteLength;
      return section;
    });

  // get list of all `filepos` references in the book,
  // which will be used to insert anchor elements
  // because only then can they be referenced in the DOM
  // NOTE: must be built BEFORE any section text is served so that anchors
  // are inserted from the first document on.
  const fileposList = [...new Set(Array.from(str.matchAll(fileposRegex), (m) => m[1]))]
    .map((filepos) => ({ filepos, number: Number(filepos) }))
    .sort((a, b) => a.number - b.number);

  // insert anchor elements for each `filepos` — foliate loadText :824-844
  const loadText = (section) => {
    const { raw } = section;
    const list = fileposList
      .filter(({ number }) => number >= section.start && number < section.end)
      .map((obj) => ({ ...obj, offset: obj.number - section.start }));
    let arr = raw;
    if (list.length) {
      arr = raw.subarray(0, list[0].offset);
      list.forEach(({ filepos, offset }, i) => {
        const next = list[i + 1];
        const a = mobi.encode(`<a id="filepos${filepos}"></a>`);
        arr = concatTypedArray3(arr, a, raw.subarray(offset, next?.offset));
      });
    }
    return mobi.decode(arr).replaceAll(mbpPagebreakRegex, "");
  };

  return {
    kind: "mobi6",
    snapshot: {
      kind: "mobi6",
      metadata: mobi.getMetadata(),
      // start/end filepos bounds — everything the sync resolveTOCHref and
      // section sizes need on the main thread
      sections: rawSections.map(({ start, end }) => ({ start, end })),
    },
    sectionText: (index) => loadText(rawSections[index]),
    // binary records by recindex-1 (img/mediarecindex) — pure record reads
    resource: (index) => mobi.loadResource(index),
  };
};

const assembleMOBI6Book = async ({ snapshot, sectionText, resource }) => {
  const cache = createResourceCache();
  // DOMParser/XMLSerializer are lazy: parse-level consumers (Node unit
  // tests) never load sections, so the book can be built without a DOM
  let parserRef = null;
  let serializerRef = null;
  const parser = () => (parserRef ??= new DOMParser());
  const serializer = () => (serializerRef ??= new XMLSerializer());
  const type = MIME.HTML;

  const createDocument = async (index) => parser().parseFromString(await sectionText(index), type);

  // resources: <img recindex="N"> → blob URLs from the binary records
  // (foliate loadResource/loadRecindex/replaceResources :790-823)
  const loadResourceURL = async (recindex, parent) =>
    cache.createURL(
      await Promise.resolve(resource(Number(recindex) - 1)),
      "",
      `mobi:rec:${recindex}`,
      parent
    );

  // filepos → section lookup over the snapshot bounds (was a TDZ hazard in
  // the pre-split factory, where the guide-TOC block ran before the const
  // resolver existed — defining it first fixes the guide TOC for real books)
  const resolveTOCHref = (href) => {
    const match = href.match(/filepos:(.*)/);
    if (!match) return null;
    const number = Number(match[1]);
    const index = snapshot.sections.findIndex((section) => section.end > number);
    if (index < 0) return null;
    return {
      index,
      anchor: (doc) => doc.getElementById(`filepos${match[1]}`) ?? 0,
    };
  };

  // foliate getGuide :782-789
  const getGuide = async () => {
    const doc = await createDocument(0);
    return Array.from(doc.getElementsByTagName("reference"), (ref) => ({
      label: ref.getAttribute("title"),
      type: ref.getAttribute("type")?.split(/\s/),
      href: `filepos:${ref.getAttribute("filepos")}`,
    }));
  };

  // foliate init :732-776 — TOC from the guide's toc reference; falls back to
  // per-section placeholder labels
  let toc = null;
  try {
    if (typeof DOMParser === "undefined") throw new Error("No DOMParser (parse-only context)");
    const landmarks = await getGuide();
    const tocHref = landmarks.find(({ type: t }) => t?.includes("toc"))?.href;
    if (tocHref) {
      const { index } = resolveTOCHref(tocHref);
      const doc = await createDocument(index);
      let lastItem;
      let lastLevel = 0;
      let lastIndent = 0;
      const lastLevelOfIndent = new Map();
      const lastParentOfLevel = new Map();
      toc = Array.from(doc.querySelectorAll("a[filepos]")).reduce((arr, a) => {
        const indent = getIndent(a);
        const item = {
          label: a.textContent?.trim() ?? "",
          href: `filepos:${a.getAttribute("filepos")}`,
        };
        const level =
          indent > lastIndent
            ? lastLevel + 1
            : indent === lastIndent
            ? lastLevel
            : lastLevelOfIndent.get(indent) ?? Math.max(0, lastLevel - 1);
        if (level > lastLevel) {
          if (lastItem) {
            lastItem.subitems ??= [];
            lastItem.subitems.push(item);
            lastParentOfLevel.set(level, lastItem);
          } else arr.push(item);
        } else {
          const parent = lastParentOfLevel.get(level);
          if (parent) parent.subitems.push(item);
          else arr.push(item);
        }
        lastItem = item;
        lastLevel = level;
        lastIndent = indent;
        lastLevelOfIndent.set(indent, level);
        return arr;
      }, []);
    }
  } catch (e) {
    console.warn(e);
  }

  const sections = snapshot.sections.map(({ start, end }, index) => {
    const name = `mobi:section:${index}`;
    let url = null;
    return {
      id: String(index),
      get url() {
        return url;
      },
      // foliate loadSection :849-871 — inject the blockquote stylesheet
      // (blockquotes in MOBI have only a small left margin by default and
      // many books rely on it), rewrite recindex/filepos, wrap as a blob
      load: async () => {
        const doc = await createDocument(index);
        const style = doc.createElement("style");
        doc.head?.append(style);
        style.append(
          doc.createTextNode(`blockquote {
            margin-block-start: 0;
            margin-block-end: 0;
            margin-inline-start: 1em;
            margin-inline-end: 0;
        }`)
        );
        for (const img of doc.querySelectorAll("img[recindex]")) {
          try {
            img.src = await loadResourceURL(img.getAttribute("recindex"), name);
          } catch {
            console.warn(`Failed to load image ${img.getAttribute("recindex")}`);
          }
        }
        for (const media of doc.querySelectorAll("[mediarecindex]")) {
          const mediarecindex = media.getAttribute("mediarecindex");
          const recindex = media.getAttribute("recindex");
          try {
            media.src = await loadResourceURL(mediarecindex, name);
            if (recindex) media.poster = await loadResourceURL(recindex, name);
          } catch {
            console.warn(`Failed to load media ${mediarecindex}`);
          }
        }
        for (const a of doc.querySelectorAll("[filepos]")) {
          a.href = `filepos:${a.getAttribute("filepos")}`;
        }
        url = await cache.createURL(serializer().serializeToString(doc), type, name);
        return url;
      },
      unload: () => {
        if (url != null) cache.unref(url);
      },
      // raw document for text extraction — no resource rewriting
      createDocument: () => createDocument(index),
      size: end - start,
      linear: "yes",
    };
  });

  return {
    sections,
    metadata: snapshot.metadata,
    toc: toc ?? sections.map((s, i) => ({ label: `Section ${i + 1}`, href: String(i) })),
    dir: "ltr",
    rendition: { layout: "reflowable" },
    transformTarget: cache.events,
    resolveTOCHref,
    destroy() {
      cache.destroy();
    },
  };
};

// foliate mobi.js:941-1238 — the KF8 (AZW3) book, split along the same
// worker seam as MOBI6: `prepareKF8` holds the FDST/skeleton/fragment
// tables, the loadRaw front/back buffering and the INDX TOC (all pure —
// this is the expensive open-time parse that motivated worker-ization);
// `assembleKF8Book` is the DOM-flavored main-thread half. The one piece of
// state that flows worker → main: fragment selectors discovered while
// splicing a section ride along with every sectionText reply, keeping the
// main thread's resolveTOCHref synchronous (closures cannot cross RPC).
const prepareKF8 = (mobi) => {
  const { exth } = mobi.headers;
  if (exth?.fixedLayout === "true") {
    throw new Error("Fixed-layout MOBI (KF8) is not yet supported — reflowable only");
  }

  const fragmentOffsets = new Map();
  const fragmentSelectors = new Map();
  const tables = {};
  let fullRawLength = null;
  let rawHead = new Uint8Array();
  let rawTail = new Uint8Array();
  let lastLoadedHead = -1;
  let lastLoadedTail = -1;
  const loadRecord = mobi.loadRecord.bind(mobi);
  const { kf8 } = mobi.headers;

  try {
    const fdstBuffer = loadRecord(kf8.fdst);
    const fdst = getStruct(FDST_HEADER, fdstBuffer);
    if (fdst.magic !== "FDST") throw new Error("Missing FDST record");
    const fdstTable = Array.from({ length: fdst.numEntries }, (_, i) => 12 + i * 8).map(
      (offset) => [
        getUint(fdstBuffer.slice(offset, offset + 4)),
        getUint(fdstBuffer.slice(offset + 4, offset + 8)),
      ]
    );
    tables.fdstTable = fdstTable;
    fullRawLength = fdstTable[fdstTable.length - 1][1];
  } catch {
    /* no FDST — flow resources unavailable, sections still load */
  }

  // skeleton + fragment tables — foliate :977-993
  const skelData = getIndexData(kf8.skel, loadRecord);
  tables.skelTable = skelData.table.map(({ name, tagMap }, index) => ({
    index,
    name,
    numFrag: tagMap[1][0],
    offset: tagMap[6][0],
    length: tagMap[6][1],
  }));
  const fragData = getIndexData(kf8.frag, loadRecord);
  tables.fragTable = fragData.table.map(({ name, tagMap }) => ({
    insertOffset: parseInt(name),
    selector: fragData.cncx[tagMap[2][0]],
    index: tagMap[4][0],
    offset: tagMap[6][0],
    length: tagMap[6][1],
  }));

  // sections from the skeleton — foliate :995-1002
  const kf8Sections = tables.skelTable.reduce((arr, skel) => {
    const last = arr[arr.length - 1];
    const fragStart = last?.fragEnd ?? 0;
    const fragEnd = fragStart + skel.numFrag;
    const frags = tables.fragTable.slice(fragStart, fragEnd);
    const length = skel.length + frags.map((f) => f.length).reduce((a, b) => a + b, 0);
    const totalLength = (last?.totalLength ?? 0) + length;
    return arr.concat({ skel, frags, fragEnd, length, totalLength });
  }, []);

  // RESC extraction up to the string (pure); the DOMParser pass stays on
  // the main thread (see assembleKF8Book) — foliate :1004-1019, best-effort
  let rescXml = null;
  try {
    const resources = getResourcesByMagic(["RESC"]);
    if (resources.RESC != null) {
      const buf = loadRecord(resources.RESC);
      const str = mobi.decode(buf.slice(16)).replace(/\0/g, "");
      // the RESC record lacks the root `<package>` element
      // but seem to be otherwise valid XML
      const index = str.search(/\?>/);
      rescXml = `<package>${str.slice(index)}</package>`;
    }
  } catch (e) {
    console.warn(e);
  }

  // foliate getResourcesByMagic :1060-1072
  function getResourcesByMagic(keys) {
    const results = {};
    const start = mobi.headers.kf8.resourceStart;
    const end = mobi.pdb.numRecords;
    for (let i = start; i < end; i++) {
      try {
        const magic = mobi.loadMagic(i);
        const match = keys.find((key) => key === magic);
        if (match) results[match] = i;
      } catch {
        /* out-of-bounds records end the scan */
      }
    }
    return results;
  }

  // NOTE: there doesn't seem to be a way of accessing text randomly?
  // how to know the decompressed size of the records without decompressing?
  // 4096 is just the maximum size — foliate loadRaw :1118-1142
  const loadRaw = (start, end) => {
    // here we load either from the front or back until we have reached the
    // required offsets; at worst you'd have to load half the book at once
    const distanceHead = end - rawHead.length;
    const distanceEnd = fullRawLength == null ? Infinity : fullRawLength - rawTail.length - start;
    // load from the start
    if (distanceHead < 0 || distanceHead < distanceEnd) {
      while (rawHead.length < end) {
        const index = ++lastLoadedHead;
        const data = mobi.loadText(index);
        rawHead = concatTypedArray(rawHead, data);
      }
      return rawHead.slice(start, end);
    }
    // load from the end
    while (fullRawLength - rawTail.length > start) {
      const index = mobi.headers.palmdoc.numTextRecords - 1 - ++lastLoadedTail;
      const data = mobi.loadText(index);
      rawTail = concatTypedArray(data, rawTail);
    }
    const rawTailStart = fullRawLength - rawTail.length;
    return rawTail.slice(start - rawTailStart, end - rawTailStart);
  };

  // TOC from the NCX INDX records — foliate :1030-1044; runs on the prepare
  // side because its fragment-offset bookkeeping feeds loadText below
  let toc = null;
  try {
    const ncx = mobi.getNCX();
    const map = ({ label, pos, children }) => {
      const [fid, off] = pos;
      const href = makePosURI(fid, off);
      const arr = fragmentOffsets.get(fid);
      if (arr) arr.push(off);
      else fragmentOffsets.set(fid, [off]);
      return {
        label: unescapeHTML(label),
        href,
        subitems: children?.map(map),
      };
    };
    toc = ncx?.map(map) ?? null;
  } catch (e) {
    console.warn(e);
  }

  const setFragmentSelector = (id, offset, selector) => {
    const map = fragmentSelectors.get(id);
    if (map) map.set(offset, selector);
    else fragmentSelectors.set(id, new Map([[offset, selector]]));
  };

  // foliate loadText :1147-1167 — splice fragments into the skeleton
  const loadText = (section) => {
    const { skel, frags, length } = section;
    const raw = loadRaw(skel.offset, skel.offset + length);
    let skeleton = raw.slice(0, skel.length);
    for (const frag of frags) {
      const insertOffset = frag.insertOffset - skel.offset;
      const offset = skel.length + frag.offset;
      const fragRaw = raw.slice(offset, offset + frag.length);
      skeleton = concatTypedArray3(
        skeleton.slice(0, insertOffset),
        fragRaw,
        skeleton.slice(insertOffset)
      );

      const offsets = fragmentOffsets.get(frag.index);
      if (offsets) {
        for (const offset of offsets) {
          const str = mobi.decode(fragRaw.slice(offset));
          const selector = getFragmentSelector(str);
          setFragmentSelector(frag.index, offset, selector);
        }
      }
    }
    return mobi.decode(skeleton);
  };

  // foliate loadFlow :1143-1145
  const loadFlow = (index) => {
    if (index < 0xffffffff && tables.fdstTable) return loadRaw(...tables.fdstTable[index]);
  };

  return {
    kind: "kf8",
    snapshot: {
      kind: "kf8",
      metadata: mobi.getMetadata(),
      toc,
      dir: exth?.pageProgressionDirection ?? "ltr",
      rescXml,
      // per-section skeleton metadata: sizes, linearity, and the fragment
      // ids the sync resolveTOCHref/index lookup runs over
      sections: kf8Sections.map((section) => ({
        size: section.length,
        linear: section.frags.length > 0 ? "yes" : "no",
        fids: section.frags.map((frag) => frag.index),
      })),
    },
    sectionText: (index) => {
      const section = kf8Sections[index];
      if (!section) throw new RangeError(`KF8 section index out of bounds: ${index}`);
      const str = loadText(section);
      // ship the selectors discovered so far so the main thread's mirror
      // stays in lockstep (idempotent — recomputed identically per call)
      const selectors = [];
      for (const [fid, map] of fragmentSelectors) {
        for (const [off, selector] of map) selectors.push([fid, off, selector]);
      }
      return { str, selectors };
    },
    // `kindle:` resource URIs — flow resources (CSS intake applied) and
    // embedded records; returns {data, mime} for the main-thread blob cache
    resource: (str) => {
      const { resourceType, id, type } = parseResourceURI(str);
      if (resourceType === "flow") {
        if (type === MIME.CSS)
          return { data: cssIntake(mobi.decode(loadFlow(id))), mime: MIME.CSS };
        return { data: loadFlow(id) ?? new Uint8Array(), mime: type };
      }
      return { data: mobi.loadResource(id - 1), mime: type };
    },
  };
};

const assembleKF8Book = async ({ snapshot, sectionText, resource }) => {
  const cache = createResourceCache();
  // DOMParser/XMLSerializer are lazy — see the MOBI6 note above
  let parserRef = null;
  let serializerRef = null;
  const parser = () => (parserRef ??= new DOMParser());
  const serializer = () => (serializerRef ??= new XMLSerializer());
  const fragmentSelectors = new Map();
  let docType = MIME.XHTML;

  const setFragmentSelector = (id, offset, selector) => {
    const map = fragmentSelectors.get(id);
    if (map) map.set(offset, selector);
    else fragmentSelectors.set(id, new Map([[offset, selector]]));
  };
  const mergeSelectors = (entries) => {
    for (const [fid, off, selector] of entries) setFragmentSelector(fid, off, selector);
  };

  // page-spread hints from the RESC record — foliate :1004-1019, best-effort
  // (RESC parsing needs DOMParser; degrade silently when unavailable)
  const pageSpreads = new Map();
  if (typeof DOMParser !== "undefined" && snapshot.rescXml != null) {
    try {
      const opf = parser().parseFromString(snapshot.rescXml, MIME.XML);
      for (const $itemref of opf.querySelectorAll("spine > itemref")) {
        const i = parseInt($itemref.getAttribute("skelid"));
        const properties = $itemref.getAttribute("properties")?.split(" ") ?? [];
        for (const p of properties) {
          if (p === "page-spread-left" || p === "rendition:page-spread-left")
            pageSpreads.set(i, "left");
          else if (p === "page-spread-right" || p === "rendition:page-spread-right")
            pageSpreads.set(i, "right");
          else if (p === "rendition:page-spread-center") pageSpreads.set(i, "center");
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }
  void pageSpreads; // spread hints are accepted but unused by our paginator

  // foliate loadResourceBlob/loadResource :1085-1110 — `kindle:` resources
  // issued through the shared cache (CSS intake already applied worker-side)
  const loadResource = async (str, parent) => {
    const { resourceType, id } = parseResourceURI(str);
    const name = `kindle:${resourceType}:${id}`;
    const { data, mime } = await Promise.resolve(resource(str));
    return cache.createURL(data, mime ?? "", name, parent);
  };

  const replaceResources = (str, parent) =>
    // replaceSeries spreads the replace-callback args, so the first param is
    // the full match string (foliate binds loadResource directly)
    replaceSeries(str, new RegExp(kindleResourceRegex, "g"), (match) =>
      loadResource(match, parent)
    );

  const sections = snapshot.sections.map((meta, index) => {
    const name = `mobi:section:${index}`;
    let url = null;
    const hasContent = meta.linear === "yes";
    return {
      id: String(index),
      get url() {
        return url;
      },
      // foliate loadSection :1172-1191
      load: async () => {
        const { str, selectors } = await sectionText(index);
        mergeSelectors(selectors);
        const replaced = await replaceResources(str, name);
        // by default, type is XHTML; change to HTML if it's not valid XHTML
        let doc = parser().parseFromString(replaced, docType);
        if (doc.querySelector("parsererror") || !doc.documentElement?.namespaceURI) {
          docType = MIME.HTML;
          doc = parser().parseFromString(replaced, docType);
        }
        url = await cache.createURL(serializer().serializeToString(doc), docType, name);
        return url;
      },
      unload: () => {
        if (url != null) cache.unref(url);
      },
      // raw document for text extraction — no resource rewriting
      createDocument: async () => {
        if (!hasContent) return null;
        const { str, selectors } = await sectionText(index);
        mergeSelectors(selectors);
        return parser().parseFromString(str, MIME.XHTML);
      },
      size: meta.size,
      linear: meta.linear,
    };
  });

  const getIndexByFID = (fid) => snapshot.sections.findIndex((meta) => meta.fids.includes(fid));

  const resolveTOCHref = (href) => {
    if (!kindlePosRegex.test(href)) return null;
    const { fid, off } = parsePosURI(href);
    const index = getIndexByFID(fid);
    if (index < 0) return null;
    const selector = fragmentSelectors.get(fid)?.get(off);
    return {
      index,
      // best-effort: the selector is known once the section's fragments have
      // been walked (the worker ships them with every sectionText reply)
      anchor: selector ? (doc) => doc.querySelector(selector) : () => 0,
    };
  };

  return {
    sections,
    metadata: snapshot.metadata,
    toc: snapshot.toc ?? sections.map((s, i) => ({ label: `Section ${i + 1}`, href: String(i) })),
    dir: snapshot.dir,
    rendition: { layout: "reflowable" },
    transformTarget: cache.events,
    resolveTOCHref,
    destroy() {
      cache.destroy();
    },
  };
};

/**
 * Pick the assembler for a prepared object (local `parseMobi` preparation
 * or the worker backend's RPC-backed one).
 * @param {{kind: string}} prepared
 */
export const assembleMobiBook = (prepared) =>
  prepared.kind === "kf8" ? assembleKF8Book(prepared) : assembleMOBI6Book(prepared);

/**
 * Parse-level introspection without building the book (Node-test seam):
 * PDB record table, MOBI header basics, MOBI6-vs-KF8 detection (including
 * the combo boundary flip) and the EXTH record names present.
 *
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {{numRecords: number, type: string, creator: string, version: number,
 *   encoding: number, compression: number, isKF8: boolean, title: string,
 *   exthKeys: string[]}}
 */
export function inspectMobi(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const mobi = new MOBI({});
  const isKF8 = mobi.open(array);
  return {
    numRecords: mobi.pdb.numRecords,
    type: mobi.pdb.type,
    creator: mobi.pdb.creator,
    version: mobi.headers.mobi.version,
    encoding: mobi.headers.mobi.encoding,
    compression: mobi.headers.palmdoc.compression,
    isKF8,
    title: mobi.getMetadata().title,
    exthKeys: Object.keys(mobi.headers.exth ?? {}),
  };
}

/**
 * Parse MOBI/KF8 (AZW3) bytes into our book shape.
 *
 * @param {Uint8Array|ArrayBuffer} bytes the raw file bytes
 * @param {{unzlib?: Function}} [options] `unzlib` decompresses embedded
 *   fonts (fflate's `unzlibSync` shape: Uint8Array → Uint8Array)
 * @returns {Promise<{
 *   sections: Array<{id: string, url: string, load: Function, unload: Function,
 *     createDocument: Function, size: number, linear: string}>,
 *   metadata: object, toc: Array<{label: string, href: string}>,
 *   dir: string, rendition: {layout: string}, transformTarget: EventTarget,
 *   resolveTOCHref: Function, destroy: Function}>}
 * @throws {Error} on unsupported inputs (unknown compression, TEXtREAd,
 *   fixed-layout KF8)
 */
export async function parseMobi(bytes, { unzlib } = {}) {
  // in-process: prepare (pure parse) + assemble (DOM) run back to back on
  // this thread; the worker backend runs prepare in the worker and feeds
  // the same assembler across the RPC seam
  return assembleMobiBook(prepareMobi(bytes, { unzlib }));
}

/**
 * Parse MOBI/KF8 bytes up to the pure-data seam (worker-safe: no DOM, no
 * blob URLs). The book worker calls this on its side and serves
 * sectionText/resource over RPC; `parseMobi` calls it and assembles
 * locally.
 *
 * @param {Uint8Array|ArrayBuffer} bytes
 * @param {{unzlib?: Function}} [options]
 * @returns {{kind: "kf8"|"mobi6", snapshot: object, sectionText: Function,
 *   resource: Function}}
 */
export const prepareMobi = (bytes, { unzlib } = {}) => {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!isMobi(array)) {
    throw new Error("Not a MOBI book: PDB type is not BOOKMOBI (TEXtREAd is unsupported)");
  }
  const mobi = new MOBI({ unzlib });
  const isKF8 = mobi.open(array);
  return isKF8 ? prepareKF8(mobi) : prepareMOBI6(mobi);
};
