package validate

import (
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strings"
	"unicode"
)

var illegalCharPattern = regexp.MustCompile(`[/\\:*?"<>|\x00-\x1F]`)

var reservedWindowsNames = map[string]bool{
	"COM1": true, "COM2": true, "COM3": true,
	"COM4": true, "COM5": true, "COM6": true,
	"COM7": true, "COM8": true, "COM9": true,
	"LPT1": true, "LPT2": true, "LPT3": true,
	"LPT4": true, "LPT5": true, "LPT6": true,
	"LPT7": true, "LPT8": true, "LPT9": true,
	"AUX": true,
	"CON": true,
	"NUL": true,
	"PRN": true,
}

func SanitizeFilename(name string) string {
	sanitized := illegalCharPattern.ReplaceAllString(name, "_")

	sanitized = strings.TrimFunc(sanitized, func(r rune) bool {
		return r == '.' || unicode.IsSpace(r)
	})

	stem := strings.ToUpper(strings.SplitN(sanitized, ".", 2)[0])
	if reservedWindowsNames[stem] {
		sanitized = "_" + sanitized
	}

	return sanitized
}

func URLFilename(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("parsing URL %q: %w", rawURL, err)
	}

	return path.Base(strings.TrimSuffix(parsed.Path, "/")), nil
}
