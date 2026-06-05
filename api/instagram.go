package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"

	"github.com/Alphka/Instagram-Downloader/config"
	"github.com/Alphka/Instagram-Downloader/log"
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

func (instagram *Instagram) CheckServerConfig(ctx context.Context) error {
	html, err := instagram.client.GetText(ctx, "/", map[string]string{
		"Accept":         "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Sec-Fetch-Dest": "document",
		"Sec-Fetch-Mode": "navigate",
		"Sec-Fetch-Site": "none",
		"Sec-Fetch-User": "?1",
		"X-Csrftoken":    "",
		"X-Ig-App-Id":    "",
	})
	if err != nil {
		return fmt.Errorf("fetching instagram home page: %w", err)
	}

	appIDMatches := appIDPattern.FindStringSubmatch(html)
	if len(appIDMatches) < 2 {
		existingAppID, _ := instagram.store.GetAppID()
		if existingAppID == "" {
			return fmt.Errorf("app ID not found in instagram home page")
		}
	} else {
		if err := instagram.store.SetAppID(appIDMatches[1]); err != nil {
			return fmt.Errorf("persisting app ID: %w", err)
		}

		appID, _ := instagram.store.GetAppID()
		if instagram.debug {
			log.Debug("app ID: %s", appID)
		}
	}

	fbDtsgMatches := fbDtsgPattern.FindStringSubmatch(html)
	if len(fbDtsgMatches) < 2 {
		existingFbDtsg, _ := instagram.store.GetFbDtsg()
		if existingFbDtsg == "" {
			return fmt.Errorf("fb_dtsg not found in instagram home page")
		}
	} else {
		if err := instagram.store.SetFbDtsg(fbDtsgMatches[1]); err != nil {
			return fmt.Errorf("persisting fb_dtsg: %w", err)
		}

		if instagram.debug {
			log.Debug("fb_dtsg: %s", fbDtsgMatches[1])
		}
	}

	return nil
}

func (instagram *Instagram) GetUserID(ctx context.Context, username string) (string, error) {
	profileURL := "https://www.instagram.com/" + username + "/"

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
	variables := map[string]any{
		"data": map[string]any{
			"count":                             count,
			"latest_reel_media":                 true,
			"latest_besties_reel_media":         true,
			"include_relationship_info":         true,
			"include_reel_media_seen_timestamp": true,
		},
		"username": username,
		"__relay_internal__pv__PolarisIsLoggedInrelayprovider":   true,
		"__relay_internal__pv__PolarisShareSheetV3relayprovider": true,
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

	form := url.Values{
		"variables":                {string(variablesJSON)},
		"server_timestamps":        {"true"},
		"fb_api_caller_class":      {"RelayModern"},
		"fb_api_req_friendly_name": {"PolarisProfilePostsQuery"},
		"doc_id":                   {"24388485070759223"},
	}

	var response QueryTimelineResponse
	err = instagram.client.PostForm(ctx, endpointQuery, form, map[string]string{
		"Accept":             "*/*",
		"Priority":           "u=1, i",
		"Referer":            "https://www.instagram.com/" + username + "/",
		"Content-Type":       "application/x-www-form-urlencoded",
		"X-Fb-Friendly-Name": "PolarisProfilePostsQuery",
		"X-Root-Field-Name":  "xdt_api__v1__feed__user_timeline_graphql_connection",
	}, &response)
	if err != nil {
		return nil, err
	}

	return &response.Data.Connection, nil
}

func (instagram *Instagram) GetHighlights(ctx context.Context, userID, username string) ([]HighlightNode, error) {
	fbDtsg, err := instagram.store.GetFbDtsg()
	if err != nil {
		return nil, fmt.Errorf("reading fb_dtsg: %w", err)
	}

	cookies, err := instagram.store.GetCookies()
	if err != nil {
		return nil, fmt.Errorf("reading cookies: %w", err)
	}

	if sessionID := cookies["sessionid"]; sessionID == "" || sessionID == `""` {
		return nil, fmt.Errorf("unauthenticated or login session expired; sessionid is missing")
	}

	referer := "/"
	if username != "" {
		referer = "https://www.instagram.com/" + username + "/"
	}

	form := url.Values{
		"dpr":                      {"1"},
		"fb_dtsg":                  {fbDtsg},
		"fb_api_caller_class":      {"RelayModern"},
		"fb_api_req_friendly_name": {"PolarisProfileStoryHighlightsTrayContentQuery"},
		"variables":                {fmt.Sprintf(`{"user_id":%q}`, userID)},
		"server_timestamps":        {"true"},
		"doc_id":                   {"36997000523232338"},
	}

	var response QueryHighlightsResponse
	err = instagram.client.PostForm(ctx, endpointQuery, form, map[string]string{
		"Accept":             "*/*",
		"Priority":           "u=1, i",
		"Referer":            referer,
		"Content-Type":       "application/x-www-form-urlencoded",
		"Sec-Fetch-Dest":     "empty",
		"Sec-Fetch-Mode":     "cors",
		"Sec-Fetch-Site":     "same-origin",
		"X-Fb-Friendly-Name": "PolarisProfileStoryHighlightsTrayContentQuery",
	}, &response)
	if err != nil {
		return nil, err
	}

	nodes := make([]HighlightNode, 0, len(response.Data.Highlights.Edges))
	for _, edge := range response.Data.Highlights.Edges {
		nodes = append(nodes, edge.Node)
	}

	return nodes, nil
}

func (instagram *Instagram) GetHighlightsContent(ctx context.Context, reelIDs []string, username string) ([]HighlightReelNode, error) {
	if len(reelIDs) == 0 {
		return nil, nil
	}

	reelIDsJSON, err := json.Marshal(reelIDs)
	if err != nil {
		return nil, fmt.Errorf("encoding reel IDs: %w", err)
	}

	referer := "/"
	if username != "" {
		referer = "https://www.instagram.com/" + username + "/"
	}

	form := url.Values{
		"variables": {fmt.Sprintf(
			`{"after":null,"before":null,"first":%d,"initial_reel_id":%q,"reel_ids":%s,"last":null}`,
			len(reelIDs),
			reelIDs[0],
			string(reelIDsJSON),
		)},
		"doc_id": {"25536143079310158"},
	}

	var response HighlightsContentResponse
	err = instagram.client.PostForm(ctx, endpointQuery, form, map[string]string{
		"Referer": referer,
	}, &response)
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
		"Referer":        "https://www.instagram.com/" + username + "/",
		"Sec-Fetch-Site": "same-origin",
		"Sec-Fetch-Dest": "empty",
		"Sec-Fetch-Mode": "cors",

		"X-Requested-With": "XMLHttpRequest",
		"Accept":           "application/json",
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
