package download

import (
	"bytes"
	"fmt"
	"io"
	"os/exec"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/Alphka/Instagram-Downloader/media"
)

var ffmpegFrameCountPattern = regexp.MustCompile(`frame=\s*(\d+)`)

func isStaticVideo(ffmpegPath, videoPath string) (bool, error) {
	command := exec.Command(ffmpegPath,
		"-i", videoPath,
		"-vf", "mpdecimate",
		"-f", "null",
		"-",
	)

	var stderr bytes.Buffer

	command.Stderr = &stderr

	if err := command.Run(); err != nil {
		if stderr.Len() == 0 {
			return false, fmt.Errorf("running ffmpeg mpdecimate: %w", err)
		}
	}

	output := strings.TrimSpace(stderr.String())
	matches := ffmpegFrameCountPattern.FindStringSubmatch(output)

	if len(matches) < 2 {
		return false, fmt.Errorf("frame count not found in ffmpeg output")
	}

	similarFrames, err := strconv.Atoi(matches[1])
	if err != nil {
		return false, fmt.Errorf("parsing frame count %q: %w", matches[1], err)
	}

	return similarFrames != 0 && similarFrames < 300, nil
}

func extractLargestFrame(ffmpegPath, videoPath string) ([]byte, error) {
	command := exec.Command(ffmpegPath,
		"-hide_banner",
		"-loglevel", "error",
		"-i", videoPath,
		"-vf", "fps=1",
		"-vcodec", "png",
		"-f", "image2pipe",
		"pipe:1",
	)

	stdoutPipe, err := command.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("creating ffmpeg stdout pipe: %w", err)
	}

	if err := command.Start(); err != nil {
		return nil, fmt.Errorf("starting ffmpeg: %w", err)
	}

	rawFrames, err := io.ReadAll(stdoutPipe)
	if err != nil {
		command.Wait()
		return nil, fmt.Errorf("reading ffmpeg stdout: %w", err)
	}

	if err := command.Wait(); err != nil {
		return nil, fmt.Errorf("ffmpeg exited with error: %w", err)
	}

	frames := media.SplitPNGFrames(rawFrames)
	if len(frames) == 0 {
		return nil, fmt.Errorf("no PNG frames found in ffmpeg output")
	}

	sort.Slice(frames, func(i, j int) bool {
		return len(frames[i]) > len(frames[j])
	})

	return frames[0], nil
}

func extractStaticVideoFrame(ffmpegPath, videoPath string) ([]byte, error) {
	isStatic, err := isStaticVideo(ffmpegPath, videoPath)
	if err != nil {
		return nil, err
	}

	if !isStatic {
		return nil, nil
	}

	pngFrame, err := extractLargestFrame(ffmpegPath, videoPath)
	if err != nil {
		return nil, err
	}

	return pngFrame, nil
}
