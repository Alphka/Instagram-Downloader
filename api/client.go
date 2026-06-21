package api

import (
	"compress/flate"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/Alphka/Instagram-Downloader/config"
	"github.com/Alphka/Instagram-Downloader/log"
	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
)

const (
	baseURL            = "https://www.instagram.com"
	endpointQuery      = "/graphql/query"
	endpointReelsMedia = "/api/v1/feed/reels_media/"
)

type Client struct {
	httpClient *http.Client
	store      *config.Store
	debug      bool
}

func NewClient(store *config.Store, debug bool) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: time.Minute,
			CheckRedirect: func(request *http.Request, via []*http.Request) error {
				if debug {
					log.Debug("Redirect intercepted: %s -> %s (via %d requests)", via[len(via)-1].URL.Path, request.URL.Path, len(via))
				}

				return http.ErrUseLastResponse
			},
		},
		store: store,
		debug: debug,
	}
}

// defaultHeaders returns the set of headers sent on every request, mimicking
// a Chrome browser on Windows to avoid Instagram's bot detection.
func defaultHeaders() map[string]string {
	return map[string]string{
		"Accept":                      "*/*",
		"Accept-Language":             "en-US,en;q=0.9",
		"Accept-Encoding":             "gzip, deflate, br, zstd",
		"Dnt":                         "1",
		"Sec-Ch-Prefers-Color-Scheme": "dark",
		"Sec-Ch-Ua":                   `"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"`,
		"Sec-Ch-Ua-Full-Version-List": `"Chromium";v="148.0.7778.179", "Google Chrome";v="148.0.7778.179", "Not/A)Brand";v="99.0.0.0"`,
		"Sec-Ch-Ua-Mobile":            "?0",
		"Sec-Ch-Ua-Model":             `""`,
		"Sec-Ch-Ua-Platform":          `"Windows"`,
		"Sec-Ch-Ua-Platform-Version":  `"19.0.0"`,
		"Sec-Fetch-Dest":              "empty",
		"Sec-Fetch-Mode":              "cors",
		"Upgrade-Insecure-Requests":   "1",
		"User-Agent":                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
	}
}

// buildRequest creates an http.Request with all headers applied in the correct
// order so that per-request overrides (including explicit deletions via "")
// always win over the defaults set by the client.
func (client *Client) buildRequest(ctx context.Context, method, rawURL string, body io.Reader, overrides map[string]string) (*http.Request, error) {
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = baseURL + rawURL
	}

	request, err := http.NewRequestWithContext(ctx, method, rawURL, body)
	if err != nil {
		return nil, err
	}

	for key, value := range defaultHeaders() {
		request.Header.Set(key, value)
	}

	if parsed, err := url.Parse(rawURL); err == nil {
		request.Header.Set("Host", parsed.Host)
		request.Header.Set("Origin", parsed.Scheme+"://"+parsed.Host)
	}

	cookies, err := client.store.GetCookies()
	if err != nil {
		return nil, fmt.Errorf("reading cookies: %w", err)
	}

	delete(cookies, "csrftoken")
	delete(cookies, "sessionid")
	delete(cookies, "ds_user_id")

	cookieHeader := config.BuildCookieHeader(cookies)
	authCookies := fmt.Sprintf("csrftoken=%s; sessionid=%s; ds_user_id=%s", client.store.GetToken(), client.store.GetSessionID(), client.store.GetUserID())

	if cookieHeader != "" {
		request.Header.Set("Cookie", authCookies+"; "+cookieHeader)
	} else {
		request.Header.Set("Cookie", authCookies)
	}

	if appID, err := client.store.GetAppID(); err == nil && appID != "" {
		request.Header.Set("X-Ig-App-Id", appID)
	}

	request.Header.Set("X-Csrftoken", client.store.GetToken())

	for key, value := range overrides {
		if value == "" {
			request.Header.Del(key)
		} else {
			request.Header.Set(key, value)
		}
	}

	return request, nil
}

// wrapContentEncodingReader wraps response.Body with the appropriate
// decompression reader based on the Content-Encoding header value. The
// returned cleanup function must be called (e.g. via defer) to release any
// resources held by the decompression reader. If no supported encoding is
// detected, the raw body is returned unchanged and cleanup is a no-op.
func (client *Client) wrapContentEncodingReader(response *http.Response) (io.Reader, func(), error) {
	reader := io.Reader(response.Body)
	cleanup := func() {}

	switch response.Header.Get("Content-Encoding") {
	case "gzip":
		gzipReader, err := gzip.NewReader(response.Body)
		if err != nil {
			return nil, cleanup, fmt.Errorf("gzip reader: %w", err)
		}

		reader = gzipReader
		cleanup = func() {
			gzipReader.Close()
		}
	case "deflate":
		flateReader := flate.NewReader(response.Body)

		reader = flateReader
		cleanup = func() {
			flateReader.Close()
		}
	case "br":
		reader = brotli.NewReader(response.Body)
	case "zstd":
		zstdReader, err := zstd.NewReader(response.Body)
		if err != nil {
			return nil, cleanup, fmt.Errorf("zstd reader: %w", err)
		}

		reader = zstdReader
		cleanup = func() {
			zstdReader.Close()
		}
	}

	return reader, cleanup, nil
}

// do executes the request, persists any Set-Cookie headers received, and
// returns the raw response body.
func (client *Client) do(request *http.Request) (*http.Response, []byte, error) {
	if client.debug {
		log.Debug("request: %s %s", request.Method, request.URL)
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, nil, fmt.Errorf("http request failed: %w", err)
	}
	defer response.Body.Close()

	reader, cleanup, err := client.wrapContentEncodingReader(response)
	if err != nil {
		return response, nil, err
	}
	defer cleanup()

	start := time.Now()
	body, err := io.ReadAll(reader)

	if client.debug {
		log.Debug("io.ReadAll: %v (%d bytes)", time.Since(start), len(body))
	}

	if err != nil {
		return response, nil, fmt.Errorf("reading response body: %w", err)
	}

	if err := client.persistSetCookies(request, response); err != nil {
		log.Errorf("persisting cookies: %v", err)
	}

	return response, body, nil
}

// persistSetCookies parses Set-Cookie headers from the response and merges
// them into the store.
func (client *Client) persistSetCookies(request *http.Request, response *http.Response) error {
	cookieHeader := request.Header.Get("Cookie")

	if !strings.Contains(cookieHeader, "csrftoken=") ||
		!strings.Contains(cookieHeader, "sessionid=") ||
		!strings.Contains(cookieHeader, "ds_user_id=") {
		return nil
	}

	incoming := make(map[string]string)

	for _, cookie := range response.Cookies() {
		switch cookie.Name {
		case "th_eu_pref":
			continue
		case "csrftoken":
			if client.store.GetToken() == cookie.Value {
				continue
			} else if client.debug {
				log.Debug("Instagram updated the csrftoken with: %s", cookie.Value)
			}

			client.store.UpdateToken(url.QueryEscape(cookie.Value))
		case "sessionid":
			client.store.UpdateSessionID(url.QueryEscape(cookie.Value))
		case "ds_user_id":
			if client.store.GetUserID() == cookie.Value {
				continue
			} else if client.debug {
				log.Debug("Instagram updated the ds_user_id with: %s", cookie.Value)
			}

			client.store.UpdateUserID(url.QueryEscape(cookie.Value))
		default:
			incoming[cookie.Name] = url.QueryEscape(cookie.Value)
		}
	}

	return client.store.MergeCookies(incoming)
}

// Get performs a GET request and decodes the JSON response into target.
func (client *Client) Get(ctx context.Context, url string, overrides map[string]string, target any) error {
	request, err := client.buildRequest(ctx, http.MethodGet, url, nil, overrides)
	if err != nil {
		return err
	}

	_, body, err := client.do(request)

	if err != nil {
		return err
	}

	if target == nil {
		return nil
	}

	return json.Unmarshal(body, target)
}

// GetRaw performs a GET request and returns the raw response bytes.
func (client *Client) GetRaw(ctx context.Context, url string, overrides map[string]string) ([]byte, error) {
	request, err := client.buildRequest(ctx, http.MethodGet, url, nil, overrides)
	if err != nil {
		return nil, err
	}

	_, body, err := client.do(request)
	return body, err
}

// GetStream performs a GET request and returns the response body as a stream.
// The caller is responsible for closing the returned ReadCloser.
func (client *Client) GetStream(ctx context.Context, url string, overrides map[string]string) (io.ReadCloser, error) {
	request, err := client.buildRequest(ctx, http.MethodGet, url, nil, overrides)
	if err != nil {
		return nil, err
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("http GET %s: %w", url, err)
	}

	if err := client.persistSetCookies(request, response); err != nil {
		log.Errorf("persisting cookies: %v", err)
	}

	return response.Body, nil
}

// GetPatternMatches performs a GET request and incrementally searches the
// response body for the first capture group (index 1) of each provided
// pattern, reading in fixed-size chunks. Reading stops as soon as all
// patterns have been matched or the response body is exhausted.
//
// A small overlap (overlapSize bytes) from the tail of each window is carried
// into the next iteration to avoid missing matches that span chunk boundaries.
//
// This function does not reuse do() because do() buffers the entire response
// body via io.ReadAll before returning. Streaming requires processing the
// body incrementally as it arrives. Content-encoding decompression is shared
// with do() via wrapContentEncodingReader.
func (client *Client) GetPatternMatches(
	ctx context.Context,
	rawURL string,
	overrides map[string]string,
	patterns []*regexp.Regexp,
) ([]string, error) {
	const chunkSize = 128 * 1024
	const overlapSize = 1 * 1024

	request, err := client.buildRequest(ctx, http.MethodGet, rawURL, nil, overrides)
	if err != nil {
		return nil, err
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer response.Body.Close()

	if err := client.persistSetCookies(request, response); err != nil {
		log.Errorf("persisting cookies: %v", err)
	}

	reader, cleanup, err := client.wrapContentEncodingReader(response)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	chunk := make([]byte, chunkSize)
	found := make([]bool, len(patterns))
	results := make([]string, len(patterns))
	remaining := len(patterns)

	var tail []byte

	for remaining > 0 {
		n, readErr := reader.Read(chunk)

		if n == 0 && readErr == nil {
			return nil, fmt.Errorf("unexpected zero-byte read from response body")
		}

		if n > 0 {
			var window []byte

			if len(tail) > 0 {
				window = make([]byte, len(tail)+n)
				copy(window, tail)
				copy(window[len(tail):], chunk[:n])
			} else {
				window = chunk[:n]
			}

			for i, pattern := range patterns {
				if found[i] {
					continue
				}

				matches := pattern.FindSubmatch(window)
				if len(matches) >= 2 {
					results[i] = string(matches[1])
					found[i] = true
					remaining--
				}
			}

			if len(window) >= overlapSize {
				tail = make([]byte, overlapSize)
				copy(tail, window[len(window)-overlapSize:])
			} else {
				tail = make([]byte, len(window))
				copy(tail, window)
			}
		}

		if readErr == io.EOF {
			break
		}

		if readErr != nil {
			return nil, fmt.Errorf("reading response body: %w", readErr)
		}
	}

	return results, nil
}

// PostForm performs a POST request with application/x-www-form-urlencoded body
// and decodes the JSON response into target.
func (client *Client) PostForm(ctx context.Context, url string, form url.Values, overrides map[string]string, target any) error {
	request, err := client.buildRequest(ctx, http.MethodPost, url, strings.NewReader(form.Encode()), overrides)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	_, responseBody, err := client.do(request)
	if err != nil {
		return err
	}

	if target == nil {
		return nil
	}

	return json.Unmarshal(responseBody, target)
}

// GetText performs a GET request and returns the raw response body as a string.
func (client *Client) GetText(ctx context.Context, url string, overrides map[string]string) (string, error) {
	request, err := client.buildRequest(ctx, http.MethodGet, url, nil, overrides)
	if err != nil {
		return "", err
	}

	_, responseBody, err := client.do(request)
	if err != nil {
		return "", err
	}

	return string(responseBody), nil
}
