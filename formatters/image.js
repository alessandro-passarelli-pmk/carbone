var crypto = require('crypto');

/**
 * Code 128B bar widths: each entry = [b1, s1, b2, s2, b3, s3] (sum = 11)
 * Index 0 = ASCII 32 (space), index 94 = ASCII 126 (~)
 * Indices 95-105 are special/start characters; 106 is unused (stop uses separate table)
 */
var CODE128_WIDTHS = [
  [2,1,2,2,2,2], // 0:  SP
  [2,2,2,1,2,2], // 1:  !
  [2,2,2,2,2,1], // 2:  "
  [1,2,1,2,2,3], // 3:  #
  [1,2,1,3,2,2], // 4:  $
  [1,3,1,2,2,2], // 5:  %
  [1,2,2,2,1,3], // 6:  &
  [1,2,2,3,1,2], // 7:  '
  [1,3,2,2,1,2], // 8:  (
  [2,2,1,2,1,3], // 9:  )
  [2,2,1,3,1,2], // 10: *
  [2,3,1,2,1,2], // 11: +
  [1,1,2,2,3,2], // 12: ,
  [1,2,2,1,3,2], // 13: -
  [1,2,2,2,3,1], // 14: .
  [1,1,3,2,2,2], // 15: /
  [1,2,3,1,2,2], // 16: 0
  [1,2,3,2,2,1], // 17: 1
  [2,2,3,2,1,1], // 18: 2
  [2,2,1,1,3,2], // 19: 3
  [2,2,1,2,3,1], // 20: 4
  [2,1,3,2,1,2], // 21: 5
  [2,2,3,1,1,2], // 22: 6
  [3,1,2,1,3,1], // 23: 7
  [3,1,1,2,2,2], // 24: 8
  [3,2,1,1,2,2], // 25: 9
  [3,2,1,2,2,1], // 26: :
  [3,1,2,2,1,2], // 27: ;
  [3,2,2,1,1,2], // 28: <
  [3,2,2,2,1,1], // 29: =
  [2,1,2,1,2,3], // 30: >
  [2,1,2,3,2,1], // 31: ?
  [2,3,2,1,2,1], // 32: @
  [1,1,1,3,2,3], // 33: A
  [1,3,1,1,2,3], // 34: B
  [1,3,1,3,2,1], // 35: C
  [1,1,2,3,1,3], // 36: D
  [1,3,2,1,1,3], // 37: E
  [1,3,2,3,1,1], // 38: F
  [2,1,1,3,1,3], // 39: G
  [2,3,1,1,1,3], // 40: H
  [2,3,1,3,1,1], // 41: I
  [1,1,2,1,3,3], // 42: J
  [1,1,2,3,3,1], // 43: K
  [1,3,2,1,3,1], // 44: L
  [1,1,3,1,2,3], // 45: M
  [1,1,3,3,2,1], // 46: N
  [1,3,3,1,2,1], // 47: O
  [3,1,3,1,2,1], // 48: P
  [2,1,1,3,3,1], // 49: Q
  [2,3,1,1,3,1], // 50: R
  [2,1,3,1,1,3], // 51: S
  [2,1,3,3,1,1], // 52: T
  [2,1,3,1,3,1], // 53: U
  [3,1,1,1,2,3], // 54: V
  [3,1,1,3,2,1], // 55: W
  [3,3,1,1,2,1], // 56: X
  [3,1,2,1,1,3], // 57: Y
  [3,1,2,3,1,1], // 58: Z
  [3,3,2,1,1,1], // 59: [
  [3,1,4,1,1,1], // 60: backslash
  [2,2,1,4,1,1], // 61: ]
  [4,3,1,1,1,1], // 62: ^
  [1,1,1,2,2,4], // 63: _
  [1,1,1,4,2,2], // 64: `
  [1,2,1,1,2,4], // 65: a
  [1,2,1,4,2,1], // 66: b
  [1,4,1,1,2,2], // 67: c
  [1,4,1,2,2,1], // 68: d
  [1,1,2,2,1,4], // 69: e
  [1,1,2,4,1,2], // 70: f
  [1,2,2,1,1,4], // 71: g
  [1,2,2,4,1,1], // 72: h
  [1,4,2,1,1,2], // 73: i
  [1,4,2,2,1,1], // 74: j
  [2,4,1,2,1,1], // 75: k
  [2,2,1,1,1,4], // 76: l
  [4,1,3,1,1,1], // 77: m
  [2,4,1,1,1,2], // 78: n
  [1,3,4,1,1,1], // 79: o
  [1,1,1,2,4,2], // 80: p
  [1,2,1,1,4,2], // 81: q
  [1,2,1,2,4,1], // 82: r
  [1,1,4,2,1,2], // 83: s
  [1,2,4,1,1,2], // 84: t
  [1,2,4,2,1,1], // 85: u
  [4,1,1,2,1,2], // 86: v
  [4,2,1,1,1,2], // 87: w
  [4,2,1,2,1,1], // 88: x
  [2,1,2,1,4,1], // 89: y
  [2,1,4,1,2,1], // 90: z
  [4,1,2,1,2,1], // 91: {
  [1,1,1,1,4,3], // 92: |
  [1,1,1,3,4,1], // 93: }
  [1,3,1,1,4,1], // 94: ~
  [1,1,4,1,1,3], // 95: (DEL / special)
  [4,1,1,1,1,3], // 96: FNC3
  [4,1,1,3,1,1], // 97: FNC2
  [1,1,3,1,4,1], // 98: Shift
  [1,1,4,1,3,1], // 99: Code C
  [3,1,1,4,1,1], // 100: Code B / FNC4
  [4,1,1,1,3,1], // 101: Code A / FNC4
  [2,1,1,1,4,2], // 102: FNC1
  [2,1,1,4,1,2], // 103: Start A
  [2,1,1,2,1,4], // 104: Start B
  [2,1,1,4,2,1]  // 105: Start C
];

/** Stop character widths (13 modules: 4 bars + 3 spaces) */
var CODE128_STOP_WIDTHS = [2,3,3,1,1,1,2];

/** Convert a widths array to a binary bit string (1=bar, 0=space) */
function widthsToBits (widths) {
  var result = '';
  for (var i = 0; i < widths.length; i++) {
    var ch = (i % 2 === 0) ? '1' : '0';
    for (var j = 0; j < widths[i]; j++) {
      result += ch;
    }
  }
  return result;
}

/**
 * Encode a string as a Code 128B bit string (including start, data, check, stop).
 * Supports ASCII 32–126 only.
 *
 * @param  {String} text  The text to encode
 * @return {String}       Bit string (e.g. '110100...') ready for SVG rendering
 */
function encodeCode128B (text) {
  var codes = [];
  // Start B (index 104)
  codes.push(104);

  for (var i = 0; i < text.length; i++) {
    var ascii = text.charCodeAt(i);
    if (ascii < 32 || ascii > 126) {
      throw new Error('Character "' + text[i] + '" is outside the Code 128B range (ASCII 32–126)');
    }
    codes.push(ascii - 32);
  }

  // Check character: (startValue + sum(pos * codeValue)) % 103
  var checkSum = 104;
  for (var j = 0; j < text.length; j++) {
    checkSum += (j + 1) * codes[j + 1]; // codes[0] is Start B, data starts at codes[1]
  }
  codes.push(checkSum % 103);

  // Build bit string from all code patterns
  var bits = '';
  for (var k = 0; k < codes.length; k++) {
    bits += widthsToBits(CODE128_WIDTHS[codes[k]]);
  }
  // Append stop character
  bits += widthsToBits(CODE128_STOP_WIDTHS);

  return bits;
}

/**
 * Convert a Code 128 bit string to an SVG image.
 *
 * @param  {String} bits       Bit string (1=bar, 0=space)
 * @param  {Number} heightPx   SVG height in pixels (default 80)
 * @return {String}            SVG document as a string
 */
function bitsToSvg (bits, heightPx) {
  var moduleWidth = 2;   // px per module
  var quietModules = 10; // quiet zone in modules
  var h = heightPx || 80;
  var totalWidth = (bits.length + 2 * quietModules) * moduleWidth;

  var x = quietModules * moduleWidth;
  var rects = '';
  var i = 0;

  while (i < bits.length) {
    var bit = bits[i];
    var runStart = i;
    while (i < bits.length && bits[i] === bit) {
      i++;
    }
    var runWidth = (i - runStart) * moduleWidth;
    if (bit === '1') {
      rects += '<rect x="' + x + '" y="0" width="' + runWidth + '" height="' + h + '" fill="black"/>';
    }
    x += runWidth;
  }

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + totalWidth + '" height="' + h + '">' +
    '<rect width="' + totalWidth + '" height="' + h + '" fill="white"/>' +
    rects +
    '</svg>';
}

/**
 * Build the ODT draw:frame XML for an embedded image.
 *
 * @param  {String} filename   Path within the ODT zip (e.g. 'Pictures/img.png')
 * @param  {String} name       Unique name for the frame element
 * @param  {String} width      ODT width string (e.g. '5cm')
 * @param  {String} height     ODT height string (e.g. '3cm')
 * @return {String}            ODT XML string
 */
function buildDrawFrame (filename, name, width, height) {
  return '<draw:frame draw:name="' + name + '" text:anchor-type="as-char"' +
    ' svg:width="' + width + '" svg:height="' + height + '" draw:z-index="0">' +
    '<draw:image xlink:href="' + filename + '" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>' +
    '</draw:frame>';
}

/**
 * Supported MIME types for image embedding
 */
var MIME_TO_EXT = {
  'image/png'     : 'png',
  'image/jpeg'    : 'jpg',
  'image/jpg'     : 'jpg',
  'image/gif'     : 'gif',
  'image/svg+xml' : 'svg',
  'image/webp'    : 'webp',
  'image/bmp'     : 'bmp'
};

/**
 * Check whether the current document extension supports ODF image embedding.
 */
function isOdfFormat (ext) {
  return ext === 'odt' || ext === 'odp' || ext === 'ods' || ext === 'odg' || ext === 'fodt';
}

/**
 * Insert an image in an ODF document (ODT, ODS, ODP) from a base64 data URI.
 *
 * Use in a template marker like: {d.imageData:imageOdt('5cm','3cm')}
 *
 * @version 3.9.0
 *
 * @example ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "2cm", "2cm"]
 *
 * @param  {String} d       Base64 data URI, e.g. 'data:image/png;base64,<data>'
 * @param  {String} width   Image width in ODT units, e.g. '5cm' or '100px' (default: '5cm')
 * @param  {String} height  Image height in ODT units, e.g. '3cm' (default: '3cm')
 * @return {String}         ODT draw:frame XML element (injected as raw XML)
 */
function imageOdt (d, width, height) {
  if (typeof d !== 'string') {
    return d;
  }
  if (!isOdfFormat(this.extension)) {
    return d;
  }

  var _width  = width  || '5cm';
  var _height = height || '3cm';

  // Un-escape XML entities that may have been applied before this formatter runs
  var _uri = d.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  if (!_uri.startsWith('data:')) {
    return d;
  }

  var _match = /^data:([^;]+);base64,(.+)$/.exec(_uri);
  if (!_match) {
    return d;
  }

  var _mimeType = _match[1].toLowerCase();
  var _base64   = _match[2];
  var _ext      = MIME_TO_EXT[_mimeType] || 'png';

  // Generate a unique filename to avoid collisions
  var _seed     = _base64.slice(0, 64) + Date.now().toString(36) + Math.random().toString(36);
  var _hash     = crypto.createHash('md5').update(_seed).digest('hex').slice(0, 12);
  var _filename = 'Pictures/carbone_' + _hash + '.' + _ext;

  if (!this.pendingFiles) {
    this.pendingFiles = [];
  }
  this.pendingFiles.push({
    name     : _filename,
    data     : Buffer.from(_base64, 'base64'),
    mimeType : _mimeType,
    parent   : ''
  });

  return buildDrawFrame(_filename, 'img_' + _hash, _width, _height);
}
imageOdt.canInjectXML = true;

/**
 * Insert a Code 128B barcode in an ODF document (ODT, ODS, ODP).
 *
 * Encodes ASCII characters in the range 32–126.
 * Use in a template marker like: {d.number:barcodeOdt('5cm','1.5cm')}
 *
 * @version 3.9.0
 *
 * @example [123456789,  "5cm", "1.5cm"]
 * @example ["HELLO-2024", "6cm", "2cm"]
 *
 * @param  {String|Number} d       Value to encode as a barcode
 * @param  {String}        width   Barcode width in ODT units (default: '5cm')
 * @param  {String}        height  Barcode height in ODT units (default: '1.5cm')
 * @return {String}                ODT draw:frame XML element (injected as raw XML)
 */
function barcodeOdt (d, width, height) {
  if (d === null || d === undefined) {
    return d;
  }
  if (!isOdfFormat(this.extension)) {
    return d;
  }

  var _width  = width  || '5cm';
  var _height = height || '1.5cm';

  // Un-escape XML entities then convert to string
  var _text = String(d)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  var _bits;
  try {
    _bits = encodeCode128B(_text);
  }
  catch (e) {
    // Unsupported characters – return plain text
    return String(d);
  }

  var _svg = bitsToSvg(_bits, 80);

  var _seed     = _text + Date.now().toString(36) + Math.random().toString(36);
  var _hash     = crypto.createHash('md5').update(_seed).digest('hex').slice(0, 12);
  var _filename = 'Pictures/barcode_' + _hash + '.svg';

  if (!this.pendingFiles) {
    this.pendingFiles = [];
  }
  this.pendingFiles.push({
    name     : _filename,
    data     : Buffer.from(_svg, 'utf8'),
    mimeType : 'image/svg+xml',
    parent   : ''
  });

  return buildDrawFrame(_filename, 'bc_' + _hash, _width, _height);
}
barcodeOdt.canInjectXML = true;

module.exports = {
  imageOdt,
  barcodeOdt,
  // Exported for testing
  _encodeCode128B  : encodeCode128B,
  _widthsToBits    : widthsToBits,
  _bitsToSvg       : bitsToSvg
};
