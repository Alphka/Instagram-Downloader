package media

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
)

var pngHeader = []byte{
	0x89, 0x50, 0x4E, 0x47,
	0x0D, 0x0A, 0x1A, 0x0A,
}

var iEndChunk = []byte{
	0x00, 0x00, 0x00, 0x00,
	0x49, 0x45, 0x4E, 0x44,
	0xAE, 0x42, 0x60, 0x82,
}

// SplitPNGFrames splits a contiguous buffer of concatenated PNG images into
// individual PNG byte slices. This is the output format produced by ffmpeg
// when using "-f image2pipe -vcodec png".
//
// The parser walks the PNG chunk structure: each chunk is
// [length(4)] [type(4)] [data(length)] [CRC(4)]. The IEND chunk signals the
// end of one image. Truncated final frames are closed with a synthetic IEND
// chunk so they can still be decoded.
func SplitPNGFrames(buffer []byte) [][]byte {
	var frames [][]byte
	offset := 0
	total := len(buffer)

	for {
		start := bytes.Index(buffer[offset:], pngHeader)
		if start == -1 {
			break
		}

		start += offset

		var lastGoodEnd int
		var consumed int

		foundIEND := false
		hasLastGoodEnd := false
		headerPosition := start + len(pngHeader)

		for {
			// Each chunk needs at minimum 8 bytes: 4 (length) + 4 (type).
			if headerPosition+8 > total {
				break
			}

			chunkLength := int(binary.BigEndian.Uint32(buffer[headerPosition : headerPosition+4]))
			typeOffset := headerPosition + 4
			chunkType := string(buffer[typeOffset : typeOffset+4])
			chunkEnd := headerPosition + 4 + 4 + chunkLength + 4

			if chunkEnd > total {
				break
			}

			lastGoodEnd = chunkEnd
			hasLastGoodEnd = true
			headerPosition = chunkEnd

			if chunkType == "IEND" {
				consumed = chunkEnd
				foundIEND = true
				break
			}
		}

		if foundIEND {
			frames = append(frames, buffer[start:consumed])
			offset = consumed
		} else if hasLastGoodEnd {
			// Truncated frame: append a synthetic IEND so decoders can still process the data.
			frame := make([]byte, lastGoodEnd-start+len(iEndChunk))

			copy(frame, buffer[start:lastGoodEnd])
			copy(frame[lastGoodEnd-start:], iEndChunk)

			frames = append(frames, frame)
			offset = lastGoodEnd
		} else {
			offset = start + 1
		}
	}

	return frames
}

// Format represents the actual image format detected from file bytes.
type Format int

const (
	FormatUnknown Format = iota
	FormatJPEG
	FormatPNG
	FormatWebP
	FormatGIF
	FormatHEIC
)

var (
	jpegMagic = []byte{0xFF, 0xD8, 0xFF}
	pngMagic  = []byte{
		0x89, 0x50, 0x4E, 0x47,
		0x0D, 0x0A, 0x1A, 0x0A,
	}
	riffMagic     = []byte("RIFF")
	webpSignature = []byte("WEBP")
	ftypBox       = []byte("ftyp")
)

// heicBrands lists the ISO base media "major brand" values that identify a
// file as HEIC/HEIF. These appear at byte offset 8, right after a 4-byte box
// size and the "ftyp" box type at offset 4. The box size itself cannot be
// matched as a fixed prefix like the other formats because it varies per file.
var heicBrands = [][]byte{
	[]byte("heic"),
	[]byte("heix"),
	[]byte("hevc"),
	[]byte("hevx"),
	[]byte("heim"),
	[]byte("heis"),
	[]byte("hevm"),
	[]byte("hevs"),
	[]byte("mif1"),
	[]byte("msf1"),
}

func DetectFormat(data []byte) Format {
	if bytes.HasPrefix(data, jpegMagic) {
		return FormatJPEG
	}

	if bytes.HasPrefix(data, pngMagic) {
		return FormatPNG
	}

	if isHEIC(data) {
		return FormatHEIC
	}

	if len(data) >= 12 && bytes.HasPrefix(data, riffMagic) && bytes.Equal(data[8:12], webpSignature) {
		return FormatWebP
	}

	return FormatUnknown
}

func isHEIC(data []byte) bool {
	if len(data) < 12 || !bytes.Equal(data[4:8], ftypBox) {
		return false
	}

	brand := data[8:12]

	for _, heicBrand := range heicBrands {
		if bytes.Equal(brand, heicBrand) {
			return true
		}
	}

	return false
}

func FormatExtension(format Format) string {
	switch format {
	case FormatJPEG:
		return "jpg"
	case FormatPNG:
		return "png"
	case FormatWebP:
		return "webp"
	case FormatHEIC:
		return "heic"
	default:
		return ""
	}
}

func ConvertPNGToJPEG(pngData []byte) ([]byte, error) {
	decodedImage, err := png.Decode(bytes.NewReader(pngData))
	if err != nil {
		return nil, fmt.Errorf("decoding PNG: %w", err)
	}

	// Convert to NRGBA if necessary so jpeg.Encode handles it correctly.
	rgbaImage := toRGBA(decodedImage)

	var outputBuffer bytes.Buffer

	if err := jpeg.Encode(&outputBuffer, rgbaImage, &jpeg.Options{Quality: 90}); err != nil {
		return nil, fmt.Errorf("encoding to JPEG: %w", err)
	}

	return outputBuffer.Bytes(), nil
}

// toRGBA converts any image.Image to *image.NRGBA, which jpeg.Encode accepts
func toRGBA(source image.Image) *image.NRGBA {
	if nrgba, ok := source.(*image.NRGBA); ok {
		return nrgba
	}

	bounds := source.Bounds()
	destination := image.NewNRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			destination.Set(x, y, source.At(x, y))
		}
	}

	return destination
}
