package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http/httptrace"
	"net/url"
	"regexp"
	"time"

	"github.com/Alphka/Instagram-Downloader/config"
	"github.com/Alphka/Instagram-Downloader/log"
)

const (
	docIDProfilePosts      = "28991540097136703"
	docIDHighlightsTray    = "36997000523232338"
	docIDHighlightsContent = "28325328583775973"
)

var userIDPatterns = []*regexp.Regexp{
	regexp.MustCompile(`\{"id":"(\d+)","profile_pic_url"`),
	regexp.MustCompile(`\{"query_id":"\d+","user_id":"(\d+)"`),
	regexp.MustCompile(`\{"content_type":"PROFILE","target_id":"(\d+)"\}`),
	regexp.MustCompile(`"profile_id":"(\d+)"`),
	regexp.MustCompile(`profilePage_(\d+)`),
}

var appIDPattern = regexp.MustCompile(`"X-IG-App-ID":"(\d+)"`)
var fbDtsgPattern = regexp.MustCompile(`"DTSGInitData",\[\],\{"token":"([-\w:]+)"`)

type Instagram struct {
	client *Client
	store  *config.Store
	debug  bool
}

func NewInstagram(client *Client, store *config.Store, debug bool) *Instagram {
	return &Instagram{
		client: client,
		store:  store,
		debug:  debug,
	}
}

func withTrace(ctx context.Context) context.Context {
	var start time.Time

	requestStart := time.Now()

	trace := &httptrace.ClientTrace{
		DNSStart: func(_ httptrace.DNSStartInfo) {
			start = time.Now()
		},
		DNSDone: func(_ httptrace.DNSDoneInfo) {
			log.Debug("DNS: %v", time.Since(start))
		},
		ConnectStart: func(_, _ string) {
			start = time.Now()
		},
		ConnectDone: func(_, _ string, _ error) {
			log.Debug("TCP: %v", time.Since(start))
		},
		TLSHandshakeStart: func() {
			start = time.Now()
		},
		TLSHandshakeDone: func(_ tls.ConnectionState, _ error) {
			log.Debug("TLS: %v", time.Since(start))
		},
		GotFirstResponseByte: func() {
			log.Debug("TTFB: %v", time.Since(requestStart))
		},
	}

	return httptrace.WithClientTrace(ctx, trace)
}

func (instagram *Instagram) CheckServerConfig(ctx context.Context) error {
	traceContext := ctx

	if instagram.debug {
		traceContext = withTrace(ctx)
	}

	matches, err := instagram.client.GetPatternMatches(traceContext, "/", map[string]string{
		"Accept":         "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Sec-Fetch-Dest": "document",
		"Sec-Fetch-Mode": "navigate",
		"Sec-Fetch-Site": "none",
		"Sec-Fetch-User": "?1",
		"X-Csrftoken":    "",
		"X-Ig-App-Id":    "",
	}, []*regexp.Regexp{appIDPattern, fbDtsgPattern})
	if err != nil {
		return fmt.Errorf("fetching instagram home page: %w", err)
	}

	appID := matches[0]
	fbDtsg := matches[1]

	if appID == "" {
		existingAppID, _ := instagram.store.GetAppID()
		if existingAppID == "" {
			return fmt.Errorf("app ID not found in instagram home page")
		}
	} else {
		if err := instagram.store.SetAppID(appID); err != nil {
			return fmt.Errorf("persisting app ID: %w", err)
		}

		if instagram.debug {
			log.Debug("app ID: %s", appID)
		}
	}

	if fbDtsg == "" {
		existingFbDtsg, _ := instagram.store.GetFbDtsg()
		if existingFbDtsg == "" {
			return fmt.Errorf("fb_dtsg not found in instagram home page")
		}
	} else {
		if err := instagram.store.SetFbDtsg(fbDtsg); err != nil {
			return fmt.Errorf("persisting fb_dtsg: %w", err)
		}

		if instagram.debug {
			log.Debug("fb_dtsg: %s", fbDtsg)
		}
	}

	instagram.client.store.MergeCookies(map[string]string{
		"dpr": "1",
		"wd":  "1920x911",
	})

	return nil
}

func (instagram *Instagram) GetUserID(ctx context.Context, username string) (string, error) {
	profileURL := "https://www.instagram.com/" + username + "/"

	if instagram.debug {
		log.Debug("Getting user ID: %s", username)
	}

	html, err := instagram.client.GetText(ctx, profileURL, map[string]string{
		"Accept":         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
		"Cookie":         "",
		"Dpr":            "1",
		"Priority":       "u=0, i",
		"Sec-Fetch-Dest": "document",
		"Sec-Fetch-Mode": "navigate",
		"Sec-Fetch-Site": "none",
		"Sec-Fetch-User": "?1",
		"X-Csrftoken":    "",
		"X-Ig-App-Id":    "",
	})
	if err != nil {
		return "", fmt.Errorf("fetching profile page for %s: %w", username, err)
	}

	for _, pattern := range userIDPatterns {
		matches := pattern.FindStringSubmatch(html)
		if len(matches) >= 2 {
			return matches[1], nil
		}
	}

	return "", fmt.Errorf("user ID not found in profile page for %s", username)
}

func (instagram *Instagram) GetTimeline(ctx context.Context, username, after string, count int) (*TimelineConnection, error) {
	const friendlyName = "PolarisProfilePostsQuery"

	variables := map[string]any{
		"data": map[string]any{
			"count":                             count,
			"latest_reel_media":                 true,
			"latest_besties_reel_media":         true,
			"include_relationship_info":         true,
			"include_reel_media_seen_timestamp": true,
		},
		"username": username,
		"__relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider":  true,
		"__relay_internal__pv__PolarisShortDramaEnabledrelayprovider":            false,
		"__relay_internal__pv__PolarisReelsRecoDebugOverlayEnabledrelayprovider": false,
	}

	if after != "" {
		variables["first"] = count
		variables["last"] = nil
		variables["before"] = nil
		variables["after"] = after
	}

	variablesJSON, err := json.Marshal(variables)
	if err != nil {
		return nil, fmt.Errorf("encoding timeline variables: %w", err)
	}

	form, err := instagram.buildGraphQLForm(friendlyName, docIDProfilePosts, string(variablesJSON))
	if err != nil {
		return nil, err
	}

	headers := graphQLHeaders(
		"https://www.instagram.com/"+username+"/",
		friendlyName,
		"xdt_api__v1__feed__user_timeline_graphql_connection",
	)

	var response QueryTimelineResponse
	err = instagram.client.PostForm(ctx, endpointQuery, form, headers, &response)
	if err != nil {
		return nil, err
	}

	return &response.Data.Connection, nil
}

func (instagram *Instagram) GetHighlights(ctx context.Context, userID, username string) ([]HighlightNode, error) {
	if sessionID := instagram.store.GetSessionID(); sessionID == "" || sessionID == `""` {
		return nil, fmt.Errorf("unauthenticated or login session expired; sessionid is missing")
	}

	const friendlyName = "PolarisProfileStoryHighlightsTrayContentQuery"

	form, err := instagram.buildGraphQLForm(friendlyName, docIDHighlightsTray, fmt.Sprintf(`{"user_id":%q}`, userID))
	if err != nil {
		return nil, err
	}

	referer := "/"
	if username != "" {
		referer = "https://www.instagram.com/" + username + "/"
	}

	var response QueryHighlightsResponse
	err = instagram.client.PostForm(ctx, endpointQuery, form, graphQLHeaders(referer, friendlyName, ""), &response)
	if err != nil {
		return nil, err
	}

	nodes := make([]HighlightNode, 0, len(response.Data.Highlights.Edges))
	for _, edge := range response.Data.Highlights.Edges {
		nodes = append(nodes, edge.Node)
	}

	return nodes, nil
}

func (instagram *Instagram) buildGraphQLForm(friendlyName, docID, variables string) (url.Values, error) {
	fbDtsg, err := instagram.store.GetFbDtsg()
	if err != nil {
		return nil, fmt.Errorf("reading fb_dtsg: %w", err)
	}

	return url.Values{
		"dpr":                      {"1"},
		"fb_dtsg":                  {fbDtsg},
		"fb_api_caller_class":      {"RelayModern"},
		"fb_api_req_friendly_name": {friendlyName},
		"variables":                {variables},
		"server_timestamps":        {"true"},
		"doc_id":                   {docID},
	}, nil
}

func graphQLHeaders(referer, friendlyName, rootFieldName string) map[string]string {
	return map[string]string{
		"Accept":             "*/*",
		"Priority":           "u=1, i",
		"Referer":            referer,
		"Sec-Fetch-Dest":     "empty",
		"Sec-Fetch-Mode":     "cors",
		"Sec-Fetch-Site":     "same-origin",
		"X-Fb-Friendly-Name": friendlyName,
		"X-Root-Field-Name":  rootFieldName,
	}
}

func (instagram *Instagram) GetHighlightsContent(ctx context.Context, reelIDs []string, username string) ([]HighlightReelNode, error) {
	if len(reelIDs) == 0 {
		return nil, nil
	}

	const friendlyName = "PolarisStoriesV3HighlightsPageQuery"

	variablesJSON, err := json.Marshal(map[string]any{
		"initial_reel_id": reelIDs[0],
		"reel_ids":        reelIDs,
		"first":           len(reelIDs),
		"last":            2,
		"__relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider": true,
	})
	if err != nil {
		return nil, fmt.Errorf("encoding highlights content variables: %w", err)
	}

	form, err := instagram.buildGraphQLForm(friendlyName, docIDHighlightsContent, string(variablesJSON))
	if err != nil {
		return nil, err
	}

	referer := "/"
	if username != "" {
		referer = "https://www.instagram.com/" + username + "/"
	}

	headers := graphQLHeaders(referer, friendlyName, "xdt_api__v1__feed__reels_media__connection")

	var response HighlightsContentResponse
	err = instagram.client.PostForm(ctx, endpointQuery, form, headers, &response)
	if err != nil {
		return nil, err
	}

	if len(response.Errors) > 0 {
		return nil, fmt.Errorf("highlights API error (%s): %s",
			response.Errors[0].Severity, response.Errors[0].Message)
	}

	nodes := make([]HighlightReelNode, 0, len(response.Data.Connection.Edges))
	for _, edge := range response.Data.Connection.Edges {
		nodes = append(nodes, edge.Node)
	}

	return nodes, nil
}

func (instagram *Instagram) GetStories(ctx context.Context, userID, username string) (*StoriesReel, error) {
	rawURL := endpointReelsMedia + "?reel_ids=" + userID

	var response StoriesResponse
	err := instagram.client.Get(ctx, rawURL, map[string]string{
		"Accept":           "*/*",
		"Referer":          "https://www.instagram.com/" + username + "/",
		"Sec-Fetch-Site":   "same-origin",
		"Sec-Fetch-Dest":   "empty",
		"Sec-Fetch-Mode":   "cors",
		"X-Requested-With": "XMLHttpRequest",
	}, &response)
	if err != nil {
		return nil, err
	}

	if instagram.debug {
		encoded, _ := json.MarshalIndent(response, "", "  ")
		log.Debug("GetStories response: %s", string(encoded))
	}

	if len(response.ReelsMedia) == 0 {
		return nil, nil
	}

	reel, exists := response.Reels[userID]
	if !exists {
		return nil, nil
	}

	return &reel, nil
}
