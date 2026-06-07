package download

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Alphka/Instagram-Downloader/api"
	"github.com/Alphka/Instagram-Downloader/config"
	"github.com/Alphka/Instagram-Downloader/log"
	"github.com/Alphka/Instagram-Downloader/media"
	"github.com/Alphka/Instagram-Downloader/validate"
)

// Options contains every setting passed from the CLI to the downloader.
type Options struct {
	Usernames              []string
	OutputDirectory        string
	QueueSize              int
	Limit                  *int
	DownloadStories        bool
	DownloadTimeline       bool
	DownloadHighlights     bool
	DownloadHighlightCover bool
	Debug                  bool
	FlatDirectory          bool
	WithThumbnails         bool
}

// Downloader orchestrates fetching content for one or more Instagram users.
type Downloader struct {
	instagram      *api.Instagram
	apiClient      *api.Client
	fileDownloader *FileDownloader
	store          *config.Store
	options        Options
	queue          *Queue
	ffmpegPath     string
	ffmpegOnce     sync.Once
}

// deduplicateUsernames removes duplicates from the slice while preserving order.
func deduplicateUsernames(usernames []string) []string {
	seen := make(map[string]bool, len(usernames))
	result := make([]string, 0, len(usernames))

	for _, username := range usernames {
		if !seen[username] {
			seen[username] = true
			result = append(result, username)
		}
	}

	return result
}

// unixToTime converts a Unix timestamp in seconds to a time.Time.
// A zero value returns time.Now() so that cover images and other files
// without a meaningful taken_at still get a sensible modification time.
func unixToTime(unix int64) time.Time {
	if unix == 0 {
		return time.Now()
	}

	return time.Unix(unix, 0)
}

// NewDownloader validates usernames, creates the HTTP client, and wires all
// internal components together.
func NewDownloader(store *config.Store, options Options) (*Downloader, error) {
	validUsernames := make([]string, 0, len(options.Usernames))

	for _, username := range deduplicateUsernames(options.Usernames) {
		if err := validate.ValidateUsername(username); err != nil {
			log.Error(err)
			continue
		}

		validUsernames = append(validUsernames, username)
	}

	if len(validUsernames) == 0 {
		return nil, errors.New("no valid usernames provided")
	}

	options.Usernames = validUsernames

	queue := NewQueue(options.QueueSize)
	apiClient := api.NewClient(store, options.Debug)
	instagram := api.NewInstagram(apiClient, store, options.Debug)
	fileDownloader := NewFileDownloader(apiClient, queue)

	return &Downloader{
		queue:          queue,
		store:          store,
		options:        options,
		apiClient:      apiClient,
		instagram:      instagram,
		fileDownloader: fileDownloader,
	}, nil
}

// Run initialises the session and downloads all requested content for every
// username. It returns a non-nil error only if every username failed; partial
// failures are logged but do not abort the run.
func (downloader *Downloader) Run(ctx context.Context) error {
	log.Info("Initializing")

	if err := downloader.instagram.CheckServerConfig(ctx); err != nil {
		return fmt.Errorf("checking server config: %w", err)
	}

	errored := 0

	for _, username := range downloader.options.Usernames {
		if err := downloader.processUser(ctx, username); err != nil {
			log.Error(err)
			errored++
		}
	}

	if errored == len(downloader.options.Usernames) {
		return errors.New("all downloads failed")
	}

	return nil
}

// processUser downloads all requested content for a single username.
func (downloader *Downloader) processUser(ctx context.Context, username string) error {
	userID, err := downloader.instagram.GetUserID(ctx, username)
	if err != nil {
		return fmt.Errorf("getting user ID for %s: %w", username, err)
	}

	if downloader.options.Debug {
		log.Debug("user %q has ID: %s", username, userID)
	}

	log.Infof("Downloading contents from user: %s (id: %s)", username, userID)

	userDirectory := filepath.Join(downloader.options.OutputDirectory, username)

	if err := os.MkdirAll(userDirectory, 0o755); err != nil {
		return fmt.Errorf("creating directory for %s: %w", username, err)
	}

	var (
		waitGroup       sync.WaitGroup
		storiesError    error
		timelineError   error
		highlightsError error
	)

	if downloader.options.DownloadStories {
		waitGroup.Go(func() {
			storiesError = downloader.downloadStories(ctx, userID, username, userDirectory)
		})
	}

	if downloader.options.DownloadTimeline {
		waitGroup.Go(func() {
			timelineError = downloader.downloadTimeline(ctx, username, userDirectory)
		})
	}

	if downloader.options.DownloadHighlights {
		waitGroup.Go(func() {
			highlightsError = downloader.downloadHighlights(ctx, userID, username, userDirectory)
		})
	}

	waitGroup.Wait()

	failedCount := 0

	for _, taskError := range []error{timelineError, highlightsError, storiesError} {
		if taskError != nil {
			log.Error(taskError)
			failedCount++
		}
	}

	enabledCount := 0

	if downloader.options.DownloadStories {
		enabledCount++
	}

	if downloader.options.DownloadTimeline {
		enabledCount++
	}

	if downloader.options.DownloadHighlights {
		enabledCount++
	}

	if failedCount == enabledCount {
		return fmt.Errorf("all content downloads failed for user: %s", username)
	}

	return nil
}

func (downloader *Downloader) limit() int {
	if downloader.options.Limit == nil {
		return 0
	}

	return *downloader.options.Limit
}

func (downloader *Downloader) isLimited() bool {
	return downloader.options.Limit != nil
}

func (downloader *Downloader) targetDirectory(base, subdirectory string) string {
	if downloader.options.FlatDirectory {
		return base
	}

	return filepath.Join(base, subdirectory)
}

func (downloader *Downloader) resolveFFmpeg() string {
	downloader.ffmpegOnce.Do(func() {
		path, err := exec.LookPath("ffmpeg")
		if err == nil {
			downloader.ffmpegPath = path
		} else {
			downloader.ffmpegPath = ""
		}
	})

	return downloader.ffmpegPath
}

func (downloader *Downloader) downloadTimeline(ctx context.Context, username, userDirectory string) error {
	var (
		count     int
		cursor    string
		firstPage = true
	)

	for {
		if downloader.isLimited() && count >= downloader.limit() {
			break
		}

		if !firstPage {
			baseDelay := 2 * time.Second
			additionalJitter := time.Duration(rand.Int64N(3000)) * time.Millisecond

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(baseDelay + additionalJitter):
			}
		}

		connection, err := downloader.instagram.GetTimeline(ctx, username, cursor, downloader.options.QueueSize)
		if err != nil {
			return fmt.Errorf("fetching timeline for %s: %w", username, err)
		}

		if firstPage {
			firstPage = false

			if len(connection.Edges) == 0 {
				log.Info("No content found in timeline")
				return nil
			}

			log.Info("Downloading timeline")
		}

		targetDirectory := downloader.targetDirectory(userDirectory, "timeline")

		if err := os.MkdirAll(targetDirectory, 0o755); err != nil {
			return fmt.Errorf("creating timeline directory: %w", err)
		}

		items := make([]api.MediaItem, 0, len(connection.Edges))
		for _, edge := range connection.Edges {
			items = append(items, api.TimelineMediaToMediaItem(edge.Node))
		}

		downloaded, limited, err := downloader.downloadItems(ctx, items, targetDirectory, count)
		if err != nil {
			return err
		}

		count += downloaded

		if limited || !connection.PageInfo.HasNextPage {
			break
		}

		cursor = connection.PageInfo.EndCursor
	}

	if count == 0 {
		log.Info("No content found in timeline")
	}

	return nil
}

// downloadHighlights fetches all highlight reels and their contents, then
// downloads each item.
func (downloader *Downloader) downloadHighlights(ctx context.Context, userID, username, userDirectory string) error {
	highlights, err := downloader.instagram.GetHighlights(ctx, userID, username)
	if err != nil {
		return fmt.Errorf("fetching highlights for %s: %w", username, err)
	}

	if len(highlights) == 0 {
		log.Info("No highlights found")
		return nil
	}

	// Map ID → node so we can look up cover URLs later.
	highlightsByID := make(map[string]api.HighlightNode, len(highlights))
	for _, highlight := range highlights {
		highlightsByID[highlight.ID] = highlight
	}

	pending := make([]api.HighlightNode, len(highlights))
	copy(pending, highlights)

	count := 0
	hasContent := false

	for len(pending) > 0 && (!downloader.isLimited() || count < downloader.limit()) {
		batchSize := 10
		if batchSize > len(pending) {
			batchSize = len(pending)
		}

		batch := pending[:batchSize]
		pending = pending[batchSize:]

		batchIDs := make([]string, len(batch))
		for index, highlight := range batch {
			batchIDs[index] = highlight.ID
		}

		reels, err := downloader.instagram.GetHighlightsContent(ctx, batchIDs, username)
		if err != nil {
			return fmt.Errorf("fetching highlight contents: %w", err)
		}

		if len(reels) == 0 {
			break
		}

		for _, reel := range reels {
			if downloader.isLimited() && count >= downloader.limit() {
				break
			}

			numericID := strings.TrimPrefix(reel.ID, "highlight:")
			log.Infof("Downloading highlight: %q (%s)", reel.Title, numericID)

			targetDirectory := downloader.targetDirectory(
				userDirectory,
				filepath.Join("highlights", validate.SanitizeFilename(reel.Title)),
			)

			if len(reel.Items) > 0 {
				hasContent = true

				if err := os.MkdirAll(targetDirectory, 0o755); err != nil {
					return fmt.Errorf("creating highlight directory: %w", err)
				}
			}

			items := make([]api.MediaItem, 0, len(reel.Items))
			for _, item := range reel.Items {
				items = append(items, api.HighlightsMediaToMediaItem(item))
			}

			downloaded, limited, err := downloader.downloadItems(ctx, items, targetDirectory, count)
			if err != nil {
				log.Errorf("downloading highlight %q items: %v", reel.Title, err)
			}

			count += downloaded

			// Download cover image if requested.
			if downloader.options.DownloadHighlightCover {
				if node, exists := highlightsByID[reel.ID]; exists {
					coverURL := node.CoverMedia.CroppedImageVersion.URL

					if coverURL != "" && (!downloader.isLimited() || count < downloader.limit()) {
						if _, err := downloader.fileDownloader.Download(ctx, coverURL, targetDirectory, time.Now()); err != nil {
							log.Errorf("downloading highlight cover: %v", err)
						} else {
							count++
						}
					}
				}
			}

			if limited {
				return nil
			}
		}
	}

	if !hasContent {
		log.Info("No content found in the highlights")
	}

	return nil
}

// downloadStories fetches and downloads all active stories for a user.
func (downloader *Downloader) downloadStories(ctx context.Context, userID, username, userDirectory string) error {
	reel, err := downloader.instagram.GetStories(ctx, userID, username)
	if err != nil {
		return fmt.Errorf("fetching stories for %s: %w", username, err)
	}

	if reel == nil || len(reel.Items) == 0 {
		log.Info("No stories found")
		return nil
	}

	log.Info("Downloading stories")

	targetDirectory := downloader.targetDirectory(userDirectory, "stories")

	if err := os.MkdirAll(targetDirectory, 0o755); err != nil {
		return fmt.Errorf("creating stories directory: %w", err)
	}

	items := make([]api.MediaItem, 0, len(reel.Items))
	for _, feedItem := range reel.Items {
		items = append(items, api.FeedItemToMediaItem(feedItem))
	}

	_, _, err = downloader.downloadItems(ctx, items, targetDirectory, 0)
	return err
}

func (downloader *Downloader) downloadItems(ctx context.Context, items []api.MediaItem, directory string, alreadyDownloaded int) (downloaded int, limited bool, err error) {
	count := alreadyDownloaded

	for _, item := range items {
		if downloader.isLimited() && count >= downloader.limit() {
			limited = true
			break
		}

		if item.IsCarousel() {
			carouselDirectory := downloader.targetDirectory(
				directory,
				filepath.Join("carousel", item.PK),
			)

			if len(item.CarouselItems) > 0 {
				if mkdirError := os.MkdirAll(carouselDirectory, 0o755); mkdirError != nil {
					return downloaded, false, fmt.Errorf("creating carousel directory: %w", mkdirError)
				}
			}

			for _, carouselItem := range item.CarouselItems {
				if downloader.isLimited() && count >= downloader.limit() {
					limited = true
					break
				}

				carouselMediaItem := api.MediaItem{
					TakenAt:       item.TakenAt,
					PK:            carouselItem.PK,
					ImageVersions: carouselItem.ImageVersions.Candidates,
					VideoVersions: carouselItem.VideoVersions,
				}

				if itemErr := downloader.downloadMediaItem(ctx, carouselMediaItem, carouselDirectory); itemErr != nil {
					log.Errorf("downloading carousel item %s: %v", carouselItem.PK, itemErr)
				}

				count++
				downloaded++
			}

			if limited {
				break
			}

			continue
		}

		if itemErr := downloader.downloadMediaItem(ctx, item, directory); itemErr != nil {
			log.Errorf("downloading item %s: %v", item.PK, itemErr)
		}

		count++
		downloaded++
	}

	return downloaded, limited, nil
}

func (downloader *Downloader) downloadMediaItem(ctx context.Context, item api.MediaItem, directory string) error {
	takenAt := unixToTime(item.TakenAt)

	bestVideo := item.BestVideo()
	bestImage := item.BestImage()

	if bestVideo != nil {
		if downloader.options.WithThumbnails && bestImage != nil {
			ffmpegPath := downloader.resolveFFmpeg()

			if bestImage.Width == 640 && ffmpegPath != "" {
				// Static video: a single image with audio. Extract the frame
				// instead of downloading the 640px cover image.
				if staticErr := downloader.tryExtractStaticFrame(ctx, ffmpegPath, bestVideo.URL, bestImage.URL, directory, takenAt); staticErr != nil {
					log.Errorf("extracting static video frame: %v", staticErr)
				}
			} else {
				// Real video thumbnail, or ffmpeg unavailable: download the
				// thumbnail directly.
				if _, err := downloader.fileDownloader.Download(ctx, bestImage.URL, directory, takenAt); err != nil {
					log.Errorf("downloading thumbnail: %v", err)
				}
			}
		}

		if _, err := downloader.fileDownloader.Download(ctx, bestVideo.URL, directory, takenAt); err != nil {
			return fmt.Errorf("downloading video: %w", err)
		}

		return nil
	}

	if bestImage != nil {
		if _, err := downloader.fileDownloader.Download(ctx, bestImage.URL, directory, takenAt); err != nil {
			return fmt.Errorf("downloading image: %w", err)
		}
	}

	return nil
}

func (downloader *Downloader) tryExtractStaticFrame(ctx context.Context, ffmpegPath, videoURL, imageURL, directory string, takenAt time.Time) error {
	imageFilename, err := validate.URLFilename(imageURL)
	if err != nil {
		return err
	}

	stem := strings.TrimSuffix(imageFilename, filepath.Ext(imageFilename))
	framePath := filepath.Join(directory, stem+"_static.jpg")

	if FileExists(framePath) {
		return nil
	}

	// Ensure the video file is on disk before passing it to ffmpeg.
	videoResult, err := downloader.fileDownloader.Download(ctx, videoURL, directory, takenAt)
	if err != nil {
		return fmt.Errorf("downloading video for static detection: %w", err)
	}

	pngFrame, err := extractStaticVideoFrame(ffmpegPath, videoResult.Path)
	if err != nil {
		return fmt.Errorf("running ffmpeg: %w", err)
	}

	// Not a static video.
	if pngFrame == nil {
		return nil
	}

	jpegData, err := media.ConvertPNGToJPEG(pngFrame)
	if err != nil {
		return fmt.Errorf("converting frame to JPEG: %w", err)
	}

	if err := os.WriteFile(framePath, jpegData, 0o644); err != nil {
		return fmt.Errorf("writing static frame: %w", err)
	}

	os.Chtimes(framePath, takenAt, takenAt)

	return nil
}
