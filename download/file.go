package download

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Alphka/Instagram-Downloader/api"
	"github.com/Alphka/Instagram-Downloader/media"
	"github.com/Alphka/Instagram-Downloader/validate"
)

type FileDownloader struct {
	apiClient *api.Client
	queue     *Queue
}

func NewFileDownloader(apiClient *api.Client, queue *Queue) *FileDownloader {
	return &FileDownloader{
		apiClient: apiClient,
		queue:     queue,
	}
}

// downloadHeaders returns the per-request header overrides used when fetching
// media files, branching on whether the URL points to an MP4 or an image.
func downloadHeaders(filename string) map[string]string {
	if strings.HasSuffix(filename, ".mp4") {
		return map[string]string{
			"Accept":         "*/*",
			"Priority":       "u=1, i",
			"Dnt":            "1",
			"Cookie":         "",
			"Pragma":         "no-cache",
			"Referer":        "https://www.instagram.com/",
			"Cache-Control":  "no-cache",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "cross-site",
			"X-Csrftoken":    "",
			"X-Ig-App-Id":    "",
		}
	}

	return map[string]string{
		"Accept":         "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
		"Priority":       "i",
		"Dnt":            "1",
		"Cookie":         "",
		"Pragma":         "no-cache",
		"Referer":        "https://www.instagram.com/",
		"Cache-Control":  "no-cache",
		"Sec-Fetch-Dest": "image",
		"Sec-Fetch-Mode": "cors",
		"Sec-Fetch-Site": "cross-site",
		"X-Csrftoken":    "",
		"X-Ig-App-Id":    "",
	}
}

type DownloadResult struct {
	Path    string
	Skipped bool
}

func (fileDownloader *FileDownloader) Download(ctx context.Context, url, directory string, takenAt time.Time) (DownloadResult, error) {
	filename, err := validate.URLFilename(url)
	if err != nil {
		return DownloadResult{}, fmt.Errorf("extracting filename from URL: %w", err)
	}

	extension := strings.ToLower(filepath.Ext(filename))
	nameWithoutExtension := strings.TrimSuffix(filename, filepath.Ext(filename))

	destinationPath := filepath.Join(directory, filename)

	if FileExists(destinationPath) {
		return DownloadResult{Path: destinationPath, Skipped: true}, nil
	}

	if extension == ".webp" {
		jpegPath := filepath.Join(directory, nameWithoutExtension+".jpg")
		if _, err := os.Stat(jpegPath); err == nil {
			return DownloadResult{Path: jpegPath, Skipped: true}, nil
		}
	}

	var result DownloadResult

	downloadError := fileDownloader.queue.Run(ctx, func() error {
		savedPath, err := fileDownloader.writeFile(ctx, url, filename, nameWithoutExtension, extension, directory, takenAt)
		if err != nil {
			return err
		}

		result = DownloadResult{Path: savedPath}
		return nil
	})

	return result, downloadError
}

func (fileDownloader *FileDownloader) writeFile(ctx context.Context, url, filename, nameWithoutExtension, extension, directory string, takenAt time.Time) (string, error) {
	switch extension {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif":
		return fileDownloader.writeImage(ctx, url, nameWithoutExtension, directory, takenAt)
	default:
		return fileDownloader.writeStream(ctx, url, filename, directory, takenAt)
	}
}

func (fileDownloader *FileDownloader) writeImage(ctx context.Context, url, nameWithoutExtension, directory string, takenAt time.Time) (string, error) {
	data, err := fileDownloader.apiClient.GetRaw(ctx, url, downloadHeaders(nameWithoutExtension+".jpg"))
	if err != nil {
		return "", fmt.Errorf("fetching image %s: %w", url, err)
	}

	detectedFormat := media.DetectFormat(data)
	extension := media.FormatExtension(detectedFormat)

	if extension == "" {
		extension = "jpg"
	}

	destinationPath := filepath.Join(directory, nameWithoutExtension+"."+extension)

	if err := os.WriteFile(destinationPath, data, 0o644); err != nil {
		return "", fmt.Errorf("writing image %s: %w", destinationPath, err)
	}

	os.Chtimes(destinationPath, takenAt, takenAt)

	return destinationPath, nil
}

func (fileDownloader *FileDownloader) writeStream(ctx context.Context, url, filename, directory string, takenAt time.Time) (string, error) {
	body, err := fileDownloader.apiClient.GetStream(ctx, url, downloadHeaders(filename))
	if err != nil {
		return "", fmt.Errorf("starting stream for %s: %w", url, err)
	}
	defer body.Close()

	destinationPath := filepath.Join(directory, filename)

	file, err := os.Create(destinationPath)
	if err != nil {
		return "", fmt.Errorf("creating file %s: %w", destinationPath, err)
	}

	if _, err := io.Copy(file, body); err != nil {
		file.Close()
		os.Remove(destinationPath)
		return "", fmt.Errorf("writing stream to %s: %w", destinationPath, err)
	}

	if err := file.Close(); err != nil {
		return "", fmt.Errorf("closing %s: %w", destinationPath, err)
	}

	os.Chtimes(destinationPath, takenAt, takenAt)

	return destinationPath, nil
}

func FileExists(path string) bool {
	info, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return false
	}

	return err == nil && !info.IsDir()
}
