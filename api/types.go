package api

type ImageVersion struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type VideoVersion struct {
	ID     string `json:"id"`
	URL    string `json:"url"`
	Type   int    `json:"type"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type ImageVersions struct {
	Candidates []ImageVersion `json:"candidates"`
}

type CarouselItem struct {
	ID             string         `json:"id"`
	PK             string         `json:"pk"`
	MediaType      int            `json:"media_type"`
	ImageVersions  ImageVersions  `json:"image_versions2"`
	VideoVersions  []VideoVersion `json:"video_versions"`
	OriginalWidth  int            `json:"original_width"`
	OriginalHeight int            `json:"original_height"`
}

type FeedItem struct {
	ID                 string         `json:"id"`
	PK                 string         `json:"pk"`
	MediaType          int            `json:"media_type"`
	ImageVersions      ImageVersions  `json:"image_versions2"`
	VideoVersions      []VideoVersion `json:"video_versions"`
	CarouselMedia      []CarouselItem `json:"carousel_media"`
	CarouselMediaCount int            `json:"carousel_media_count"`
	TakenAt            int64          `json:"taken_at"`
}

type GraphTimelineMedia struct {
	ID                 string         `json:"id"`
	PK                 string         `json:"pk"`
	ImageVersions      ImageVersions  `json:"image_versions2"`
	VideoVersions      []VideoVersion `json:"video_versions"`
	CarouselMedia      []CarouselItem `json:"carousel_media"`
	CarouselMediaCount int            `json:"carousel_media_count"`
	TakenAt            int64          `json:"taken_at"`
}

type GraphHighlightsMedia struct {
	ID            string         `json:"id"`
	PK            string         `json:"pk"`
	ImageVersions ImageVersions  `json:"image_versions2"`
	VideoVersions []VideoVersion `json:"video_versions"`
	TakenAt       int64          `json:"taken_at"`
}

type TimelinePageInfo struct {
	StartCursor     *string `json:"start_cursor"`
	EndCursor       string  `json:"end_cursor"`
	HasPreviousPage bool    `json:"has_previous_page"`
	HasNextPage     bool    `json:"has_next_page"`
}

type TimelineConnection struct {
	PageInfo TimelinePageInfo `json:"page_info"`
	Edges    []struct {
		Node   GraphTimelineMedia `json:"node"`
		Cursor string             `json:"cursor"`
	} `json:"edges"`
}

type QueryTimelineResponse struct {
	Data struct {
		Connection TimelineConnection `json:"xdt_api__v1__feed__user_timeline_graphql_connection"`
	} `json:"data"`
}

type HighlightNode struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	CoverMedia struct {
		CroppedImageVersion struct {
			URL string `json:"url"`
		} `json:"cropped_image_version"`
	} `json:"cover_media"`
}

type QueryHighlightsResponse struct {
	Data struct {
		Highlights struct {
			Edges []struct {
				Node   HighlightNode `json:"node"`
				Cursor string        `json:"cursor"`
			} `json:"edges"`
		} `json:"highlights"`
	} `json:"data"`
}

type HighlightReelNode struct {
	ID         string                 `json:"id"`
	Title      string                 `json:"title"`
	Items      []GraphHighlightsMedia `json:"items"`
	CoverMedia struct {
		CroppedImageVersion struct {
			URL string `json:"url"`
		} `json:"cropped_image_version"`
	} `json:"cover_media"`
}

type HighlightsContentResponse struct {
	Data struct {
		Connection struct {
			Edges []struct {
				Node   HighlightReelNode `json:"node"`
				Cursor string            `json:"cursor"`
			} `json:"edges"`
		} `json:"xdt_api__v1__feed__reels_media__connection"`
	} `json:"data"`
	Errors []struct {
		Message  string `json:"message"`
		Severity string `json:"severity"`
	} `json:"errors"`
}

type StoriesReel struct {
	ID    string     `json:"id"`
	Items []FeedItem `json:"items"`
}

type StoriesResponse struct {
	Reels      map[string]StoriesReel `json:"reels"`
	ReelsMedia []StoriesReel          `json:"reels_media"`
}

type MediaItem struct {
	PK            string
	ImageVersions []ImageVersion
	VideoVersions []VideoVersion
	CarouselItems []CarouselItem
	TakenAt       int64
}

func (item *MediaItem) BestImage() *ImageVersion {
	if len(item.ImageVersions) == 0 {
		return nil
	}

	return &item.ImageVersions[0]
}

func (item *MediaItem) BestVideo() *VideoVersion {
	if len(item.VideoVersions) == 0 {
		return nil
	}

	return &item.VideoVersions[0]
}

func (item *MediaItem) IsCarousel() bool {
	return len(item.CarouselItems) > 0
}

func FeedItemToMediaItem(feedItem FeedItem) MediaItem {
	return MediaItem{
		PK:            feedItem.PK,
		ImageVersions: feedItem.ImageVersions.Candidates,
		VideoVersions: feedItem.VideoVersions,
		CarouselItems: feedItem.CarouselMedia,
		TakenAt:       feedItem.TakenAt,
	}
}

func TimelineMediaToMediaItem(timelineMedia GraphTimelineMedia) MediaItem {
	return MediaItem{
		PK:            timelineMedia.PK,
		ImageVersions: timelineMedia.ImageVersions.Candidates,
		VideoVersions: timelineMedia.VideoVersions,
		CarouselItems: timelineMedia.CarouselMedia,
		TakenAt:       timelineMedia.TakenAt,
	}
}

func HighlightsMediaToMediaItem(highlightsMedia GraphHighlightsMedia) MediaItem {
	return MediaItem{
		PK:            highlightsMedia.PK,
		ImageVersions: highlightsMedia.ImageVersions.Candidates,
		VideoVersions: highlightsMedia.VideoVersions,
		TakenAt:       highlightsMedia.TakenAt,
	}
}
