package media

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"hash/crc32"
	"testing"
)

func TestDetectFormat(t *testing.T) {
	cases := []struct {
		name     string
		data     []byte
		expected Format
	}{
		{
			name:     "JPEG magic bytes",
			data:     []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10},
			expected: FormatJPEG,
		},
		{
			name: "PNG magic bytes",
			data: []byte{
				0x89, 0x50, 0x4E, 0x47,
				0x0D, 0x0A, 0x1A, 0x0A,
			},
			expected: FormatPNG,
		},
		{
			name: "WebP magic bytes",
			data: []byte{
				'R', 'I', 'F', 'F',
				0x00, 0x00, 0x00, 0x00,
				'W', 'E', 'B', 'P',
			},
			expected: FormatWebP,
		},
		{
			name:     "unknown format",
			data:     []byte{0x00, 0x01, 0x02, 0x03},
			expected: FormatUnknown,
		},
		{
			name:     "empty buffer",
			data:     []byte{},
			expected: FormatUnknown,
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			result := DetectFormat(testCase.data)
			if result != testCase.expected {
				t.Errorf("DetectFormat returned %v, want %v", result, testCase.expected)
			}
		})
	}
}

func TestFormatExtension(t *testing.T) {
	cases := []struct {
		format   Format
		expected string
	}{
		{FormatJPEG, "jpg"},
		{FormatPNG, "png"},
		{FormatWebP, "webp"},
		{FormatUnknown, ""},
	}

	for _, testCase := range cases {
		result := FormatExtension(testCase.format)
		if result != testCase.expected {
			t.Errorf("FormatExtension(%v) = %q, want %q", testCase.format, result, testCase.expected)
		}
	}
}

func buildMinimalPNG(t *testing.T) []byte {
	t.Helper()

	signature := []byte{
		0x89, 0x50, 0x4E, 0x47,
		0x0D, 0x0A, 0x1A, 0x0A,
	}

	buildChunk := func(chunkType string, data []byte) []byte {
		length := make([]byte, 4)
		binary.BigEndian.PutUint32(length, uint32(len(data)))

		typeBytes := []byte(chunkType)
		checksum := crc32.NewIEEE()
		checksum.Write(typeBytes)
		checksum.Write(data)
		crcBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(crcBytes, checksum.Sum32())

		chunk := make([]byte, 0, 4+4+len(data)+4)
		chunk = append(chunk, length...)
		chunk = append(chunk, typeBytes...)
		chunk = append(chunk, data...)
		chunk = append(chunk, crcBytes...)
		return chunk
	}

	ihdrData := []byte{
		0, 0, 0, 1, // width
		0, 0, 0, 1, // height
		8,       // bit depth
		0,       // color type: greyscale
		0, 0, 0, // compression, filter, interlace
	}

	// IDAT: raw scanline is filter byte (0x00) + one pixel byte (0x80).
	var compressed bytes.Buffer
	writer := zlib.NewWriter(&compressed)
	writer.Write([]byte{0x00, 0x80})
	writer.Close()

	ihdr := buildChunk("IHDR", ihdrData)
	idat := buildChunk("IDAT", compressed.Bytes())
	iend := buildChunk("IEND", []byte{})

	png := make([]byte, 0, len(signature)+len(ihdr)+len(idat)+len(iend))
	png = append(png, signature...)
	png = append(png, ihdr...)
	png = append(png, idat...)
	png = append(png, iend...)

	return png
}

func TestSplitPNGFrames_SingleFrame(t *testing.T) {
	png := buildMinimalPNG(t)
	frames := SplitPNGFrames(png)

	if len(frames) != 1 {
		t.Fatalf("expected 1 frame, got %d", len(frames))
	}

	if !bytes.Equal(frames[0], png) {
		t.Error("single-frame result does not match the original PNG bytes")
	}
}

func TestSplitPNGFrames_MultipleFrames(t *testing.T) {
	png := buildMinimalPNG(t)
	concatenated := append(png, png...)
	frames := SplitPNGFrames(concatenated)

	if len(frames) != 2 {
		t.Fatalf("expected 2 frames, got %d", len(frames))
	}
}

func TestSplitPNGFrames_EmptyBuffer(t *testing.T) {
	frames := SplitPNGFrames([]byte{})

	if len(frames) != 0 {
		t.Fatalf("expected 0 frames for empty input, got %d", len(frames))
	}
}

func TestSplitPNGFrames_NoPNGHeader(t *testing.T) {
	frames := SplitPNGFrames([]byte("this is not a PNG"))

	if len(frames) != 0 {
		t.Fatalf("expected 0 frames for non-PNG input, got %d", len(frames))
	}
}
