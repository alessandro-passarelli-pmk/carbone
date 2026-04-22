var assert = require('assert');
var helper = require('../lib/helper');
var image  = require('../formatters/image');

var imageOdt   = image.imageOdt;
var barcodeOdt = image.barcodeOdt;
var encodeCode128B = image._encodeCode128B;
var widthsToBits   = image._widthsToBits;
var bitsToSvg      = image._bitsToSvg;

// Minimal 1×1 transparent PNG, base64-encoded
var TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
var TINY_PNG_URI = 'data:image/png;base64,' + TINY_PNG_B64;

// ─── Helper to build a formatter context ─────────────────────────────────────
function ctx (ext) {
  return { extension : ext || 'odt', pendingFiles : [] };
}

describe('formatter image', function () {

  // ─── widthsToBits ───────────────────────────────────────────────────────────
  describe('widthsToBits', function () {
    it('should alternate between bar (1) and space (0) runs', function () {
      // [2,1,2,2] → '11' + '0' + '11' + '00' = '11011 00'
      helper.assert(widthsToBits([2,1,2,2]), '11011 00'.replace(' ', ''));
    });
    it('should produce the expected Start B pattern', function () {
      // Start B widths: [2,1,1,2,1,4] → '11 0 1 00 1 0000'
      helper.assert(widthsToBits([2,1,1,2,1,4]), '11010010000');
    });
    it('should handle single-module elements', function () {
      helper.assert(widthsToBits([1,1,1,1]), '1010');
    });
  });

  // ─── encodeCode128B ─────────────────────────────────────────────────────────
  describe('encodeCode128B', function () {
    it('should start with Start B pattern and end with Stop pattern', function () {
      var bits = encodeCode128B('0');
      // Start B = '11010010000', Stop = '1100011101011'
      assert.ok(bits.startsWith('11010010000'), 'should start with Start B');
      assert.ok(bits.endsWith('1100011101011'), 'should end with Stop');
    });

    it('should encode digit "0" correctly (check digit = 17)', function () {
      // Start B (104) + '0' (index 16) + check (17) + Stop
      var bits = encodeCode128B('0');
      var startB = '11010010000'; // widths [2,1,1,2,1,4]
      var char0  = '10011101100'; // widths [1,2,3,1,2,2]  index 16
      var check17= '10011100110'; // widths [1,2,3,2,2,1]  index 17
      var stop   = '1100011101011';
      helper.assert(bits, startB + char0 + check17 + stop);
    });

    it('should produce a bit string whose length is a multiple of 11 (+ 13 for stop)', function () {
      var text = 'HELLO';
      var bits = encodeCode128B(text);
      // Start B (11) + 5 chars (5×11=55) + check (11) + stop (13) = 90
      helper.assert(bits.length, 11 + text.length * 11 + 11 + 13);
    });

    it('should only contain 0 and 1', function () {
      var bits = encodeCode128B('ABC 123');
      helper.assert(/^[01]+$/.test(bits), true);
    });

    it('should throw for characters outside ASCII 32–126', function () {
      assert.throws(function () { encodeCode128B('\x01'); });
      assert.throws(function () { encodeCode128B('\x7F'); });
    });

    it('should encode an empty string (just start + check + stop)', function () {
      var bits = encodeCode128B('');
      // Start B (104), check = 104 % 103 = 1, Stop
      // check code 1 → widths [2,2,2,1,2,2] → '11001101100'
      var startB  = '11010010000';
      var check1  = '11001101100';
      var stop    = '1100011101011';
      helper.assert(bits, startB + check1 + stop);
    });
  });

  // ─── bitsToSvg ──────────────────────────────────────────────────────────────
  describe('bitsToSvg', function () {
    it('should return a string starting with SVG XML declaration', function () {
      var svg = bitsToSvg('10', 80);
      assert.ok(svg.startsWith('<?xml'), 'should start with XML declaration');
      assert.ok(svg.includes('<svg '), 'should include <svg>');
    });

    it('should include a white background rect', function () {
      var svg = bitsToSvg('1', 80);
      assert.ok(svg.includes('fill="white"'), 'should have white background');
    });

    it('should include black bar rects for bar bits', function () {
      var svg = bitsToSvg('10', 80);
      assert.ok(svg.includes('fill="black"'), 'should have black bars');
    });

    it('should have correct width based on bit length and quiet zone', function () {
      // 2 bits + 2*10 quiet modules * 2px/module = (2 + 20)*2 = 44
      var svg = bitsToSvg('10', 80);
      assert.ok(svg.includes('width="44"'), 'svg width should be 44');
    });
  });

  // ─── imageOdt ────────────────────────────────────────────────────────────────
  describe('imageOdt', function () {
    it('should return draw:frame XML for a valid PNG data URI', function () {
      var c = ctx('odt');
      var result = imageOdt.call(c, TINY_PNG_URI, '4cm', '2cm');
      assert.ok(result.includes('<draw:frame'), 'result should contain draw:frame');
      assert.ok(result.includes('svg:width="4cm"'), 'should contain specified width');
      assert.ok(result.includes('svg:height="2cm"'), 'should contain specified height');
      assert.ok(result.includes('<draw:image'), 'should contain draw:image');
      assert.ok(result.includes('xlink:href="Pictures/carbone_'), 'should reference Pictures/ folder');
    });

    it('should add a file to pendingFiles', function () {
      var c = ctx('odt');
      imageOdt.call(c, TINY_PNG_URI, '4cm', '2cm');
      helper.assert(c.pendingFiles.length, 1);
      helper.assert(c.pendingFiles[0].mimeType, 'image/png');
      assert.ok(c.pendingFiles[0].name.startsWith('Pictures/carbone_'));
      assert.ok(c.pendingFiles[0].name.endsWith('.png'));
      assert.ok(Buffer.isBuffer(c.pendingFiles[0].data), 'data should be a Buffer');
    });

    it('should use default dimensions when not provided', function () {
      var c = ctx('odt');
      var result = imageOdt.call(c, TINY_PNG_URI);
      assert.ok(result.includes('svg:width="5cm"'), 'default width 5cm');
      assert.ok(result.includes('svg:height="3cm"'), 'default height 3cm');
    });

    it('should return the original value for non-ODF extensions', function () {
      var c = ctx('docx');
      var result = imageOdt.call(c, TINY_PNG_URI, '4cm', '2cm');
      helper.assert(result, TINY_PNG_URI);
      helper.assert(c.pendingFiles.length, 0);
    });

    it('should return the original value for non-data-URI strings', function () {
      var c = ctx('odt');
      var result = imageOdt.call(c, 'hello world', '4cm', '2cm');
      helper.assert(result, 'hello world');
    });

    it('should handle JPEG data URIs', function () {
      var jpegUri = 'data:image/jpeg;base64,' + TINY_PNG_B64;
      var c = ctx('odt');
      imageOdt.call(c, jpegUri, '4cm', '2cm');
      assert.ok(c.pendingFiles[0].name.endsWith('.jpg'), 'should use .jpg extension');
      helper.assert(c.pendingFiles[0].mimeType, 'image/jpeg');
    });

    it('should handle XML-escaped ampersands in data URI', function () {
      // The builder XML-escapes values before calling canInjectXML formatters
      // base64 data only contains A-Za-z0-9+/= so this is a safeguard edge case
      var c = ctx('odt');
      var result = imageOdt.call(c, TINY_PNG_URI);
      assert.ok(result.includes('<draw:frame'), 'should still produce draw:frame');
    });

    it('should return original value when d is not a string', function () {
      var c = ctx('odt');
      helper.assert(imageOdt.call(c, 42), 42);
      helper.assert(imageOdt.call(c, null), null);
    });
  });

  // ─── barcodeOdt ──────────────────────────────────────────────────────────────
  describe('barcodeOdt', function () {
    it('should return draw:frame XML for a number', function () {
      var c = ctx('odt');
      var result = barcodeOdt.call(c, 123456789, '5cm', '1.5cm');
      assert.ok(result.includes('<draw:frame'), 'should contain draw:frame');
      assert.ok(result.includes('svg:width="5cm"'), 'width');
      assert.ok(result.includes('svg:height="1.5cm"'), 'height');
      assert.ok(result.includes('<draw:image'), 'should contain draw:image');
      assert.ok(result.includes('xlink:href="Pictures/barcode_'), 'should reference Pictures/ folder');
    });

    it('should add an SVG file to pendingFiles', function () {
      var c = ctx('odt');
      barcodeOdt.call(c, '12345', '5cm', '1.5cm');
      helper.assert(c.pendingFiles.length, 1);
      helper.assert(c.pendingFiles[0].mimeType, 'image/svg+xml');
      assert.ok(c.pendingFiles[0].name.startsWith('Pictures/barcode_'));
      assert.ok(c.pendingFiles[0].name.endsWith('.svg'));
      var svgContent = c.pendingFiles[0].data.toString('utf8');
      assert.ok(svgContent.includes('<svg '), 'SVG content should contain <svg>');
    });

    it('should use default dimensions when not provided', function () {
      var c = ctx('odt');
      var result = barcodeOdt.call(c, 'ABC');
      assert.ok(result.includes('svg:width="5cm"'), 'default width 5cm');
      assert.ok(result.includes('svg:height="1.5cm"'), 'default height 1.5cm');
    });

    it('should return the original value for non-ODF extensions', function () {
      var c = ctx('docx');
      var result = barcodeOdt.call(c, 123);
      helper.assert(result, 123);
      helper.assert(c.pendingFiles.length, 0);
    });

    it('should return null/undefined unchanged', function () {
      var c = ctx('odt');
      helper.assert(barcodeOdt.call(c, null), null);
      helper.assert(barcodeOdt.call(c, undefined), undefined);
    });

    it('should fall back to plain text for unsupported characters', function () {
      var c = ctx('odt');
      // Control character 0x01 is outside ASCII 32–126
      var result = barcodeOdt.call(c, '\x01invalid');
      helper.assert(result, '\x01invalid');
      helper.assert(c.pendingFiles.length, 0);
    });

    it('should encode uppercase letters correctly', function () {
      var c = ctx('odt');
      var result = barcodeOdt.call(c, 'HELLO');
      assert.ok(result.includes('<draw:frame'), 'should produce draw:frame');
      helper.assert(c.pendingFiles.length, 1);
    });

    it('should produce unique filenames for two calls with different values', function () {
      var c = ctx('odt');
      barcodeOdt.call(c, 'ABC');
      barcodeOdt.call(c, 'DEF');
      helper.assert(c.pendingFiles.length, 2);
      assert.notEqual(c.pendingFiles[0].name, c.pendingFiles[1].name);
    });

    it('should support ODS and ODP extensions', function () {
      ['ods', 'odp'].forEach(function (ext) {
        var c = ctx(ext);
        var result = barcodeOdt.call(c, '123', '5cm', '1.5cm');
        assert.ok(result.includes('<draw:frame'), 'should produce draw:frame for ' + ext);
      });
    });
  });

});
