package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"

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
		envFlag          string
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

			envFilePath, err := resolveEnvFilePath(envFlag)
			if err != nil {
				return err
			}

			if err := loadDotEnv(envFilePath); err != nil {
				if os.IsNotExist(err) {
					return fmt.Errorf("credentials file not found at %q; use --env to specify a path", envFilePath)
				}
				return fmt.Errorf("loading credentials file: %w", err)
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

			if err := store.LoadFromEnvironment(); err != nil {
				return fmt.Errorf("loading credentials from environment: %w", err)
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
	flags.StringVar(&envFlag, "env", "", "path to credentials file (default: .env next to the executable)")
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

func resolveEnvFilePath(envFlag string) (string, error) {
	if envFlag != "" {
		if _, err := os.Stat(envFlag); err != nil {
			return "", fmt.Errorf("env file not found: %s", envFlag)
		}

		return envFlag, nil
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("getting working directory: %w", err)
	}

	cwdEnvPath := filepath.Join(cwd, ".env")
	if _, err := os.Stat(cwdEnvPath); err == nil {
		return cwdEnvPath, nil
	}

	executable, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("resolving executable path: %w", err)
	}

	return filepath.Join(filepath.Dir(executable), ".env"), nil
}

func loadDotEnv(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("reading env file %s: %w", path, err)
	}

	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)

		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}

	return nil
}
