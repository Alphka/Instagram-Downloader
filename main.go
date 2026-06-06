package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"

	"github.com/Alphka/Instagram-Downloader/config"
	"github.com/Alphka/Instagram-Downloader/download"
	"github.com/Alphka/Instagram-Downloader/log"
	"github.com/spf13/cobra"
)

const version = "1.0.0"

func main() {
	var (
		force            bool
		limit            int
		debug            bool
		queueSize        int
		noStories        bool
		outputFlag       string
		noTimeline       bool
		noHighlights     bool
		noHighlightCover bool
		flatDirectory    bool
		withThumbnails   bool
		setToken         string
		setUserID        string
		setSessionID     string
	)

	rootCommand := &cobra.Command{
		Use:     "instadl <username> [username...]",
		Short:   "Download content from Instagram",
		Version: version,
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if noStories && noTimeline && noHighlights {
				return errors.New("at least one content type must be enabled (stories, timeline, or highlights)")
			}

			if noHighlights {
				noHighlightCover = true
			}

			configDirectory, err := config.DefaultDirectory()
			if err != nil {
				return fmt.Errorf("resolving config directory: %w", err)
			}

			outputDirectory, err := resolveOutputDirectory(outputFlag, configDirectory, force)
			if err != nil {
				return err
			}

			store, err := config.OpenStore(configDirectory)
			if err != nil {
				return fmt.Errorf("opening config store: %w", err)
			}
			defer store.Close()

			if err := store.InitializeCredentials(setToken, setSessionID, setUserID); err != nil {
				return err
			}

			var itemLimit *int
			if cmd.Flags().Changed("limit") {
				itemLimit = &limit
			}

			options := download.Options{
				Usernames:              args,
				OutputDirectory:        outputDirectory,
				QueueSize:              queueSize,
				Limit:                  itemLimit,
				DownloadStories:        !noStories,
				DownloadTimeline:       !noTimeline,
				DownloadHighlights:     !noHighlights,
				DownloadHighlightCover: !noHighlightCover,
				Debug:                  debug,
				FlatDirectory:          flatDirectory,
				WithThumbnails:         withThumbnails,
			}

			downloader, err := download.NewDownloader(store, options)
			if err != nil {
				return err
			}

			return downloader.Run(cmd.Context())
		},
	}

	flags := rootCommand.Flags()
	flags.StringVarP(&outputFlag, "output", "o", "", "output directory")
	flags.StringVar(&setToken, "set-token", "", "set or overwrite authentication CSRF token")
	flags.StringVar(&setUserID, "set-userid", "", "set or overwrite authentication user ID")
	flags.StringVar(&setSessionID, "set-sessionid", "", "set or overwrite authentication session ID")
	flags.BoolVarP(&force, "force", "f", false, "force creation of output directory if it does not exist")
	flags.IntVarP(&queueSize, "queue", "q", 12, "number of concurrent downloads")
	flags.IntVarP(&limit, "limit", "l", 0, "maximum number of items to download per user")
	flags.BoolVar(&noStories, "no-stories", false, "skip stories download")
	flags.BoolVar(&noTimeline, "no-timeline", false, "skip timeline download")
	flags.BoolVar(&noHighlights, "no-highlights", false, "skip highlights download")
	flags.BoolVar(&noHighlightCover, "no-hcover", false, "skip highlight cover download")
	flags.BoolVarP(&debug, "debug", "d", false, "enable verbose output")
	flags.BoolVar(&flatDirectory, "flat-dir", false, "save all user content into a single directory")
	flags.BoolVar(&withThumbnails, "with-thumbs", false, "also download video thumbnails (requires ffmpeg in PATH for static video detection)")

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	if err := rootCommand.ExecuteContext(ctx); err != nil {
		log.Error(err)
		os.Exit(1)
	}
}

func resolveOutputDirectory(outputFlag, configDirectory string, force bool) (string, error) {
	var target string

	if outputFlag != "" {
		if filepath.IsAbs(outputFlag) {
			target = outputFlag
		} else {
			cwd, err := os.Getwd()
			if err != nil {
				return "", fmt.Errorf("getting working directory: %w", err)
			}
			target = filepath.Join(cwd, outputFlag)
		}
	} else {
		target = filepath.Join(configDirectory, "output")
	}

	info, statError := os.Stat(target)

	if statError == nil {
		if !info.IsDir() {
			return "", errors.New("output path exists but is not a directory")
		}

		return target, nil
	}

	if !os.IsNotExist(statError) {
		return "", fmt.Errorf("checking output directory: %w", statError)
	}

	if outputFlag != "" && !force {
		return "", errors.New("output directory does not exist; use --force to create it")
	}

	if err := os.MkdirAll(target, 0o755); err != nil {
		return "", fmt.Errorf("creating output directory: %w", err)
	}

	return target, nil
}
