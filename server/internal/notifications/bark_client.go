package notifications

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var ErrBarkURLEmpty = errors.New("bark URL is empty")

type BarkClient struct {
	httpClient *http.Client
}

func NewBarkClient() *BarkClient {
	return &BarkClient{
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// Send pushes a notification via Bark.
// barkURL is the user's Bark server URL (e.g. "https://api.day.app/YOURKEY").
func (c *BarkClient) Send(barkURL, title, body string) error {
	if barkURL == "" {
		return ErrBarkURLEmpty
	}

	// Validate URL
	parsed, err := url.Parse(barkURL)
	if err != nil {
		return fmt.Errorf("invalid bark URL: %w", err)
	}
	if parsed.Scheme != "https" && parsed.Scheme != "http" {
		return fmt.Errorf("bark URL must use http or https scheme")
	}

	// Build the Bark push URL: <barkURL>/<title>/<body>
	pushURL := strings.TrimRight(barkURL, "/") +
		"/" + url.PathEscape(title) +
		"/" + url.PathEscape(body) +
		"?group=jiceot&icon=https://jiceot.dannyswat.me/jiceot.svg"

	resp, err := c.httpClient.Get(pushURL)
	if err != nil {
		return fmt.Errorf("bark request failed: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bark returned status %d", resp.StatusCode)
	}

	return nil
}
