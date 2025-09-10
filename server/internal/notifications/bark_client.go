package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type BarkRequest struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

func SendNotificationViaBark(apiUrl, title, body string) error {
	if apiUrl == "" {
		return fmt.Errorf("bark API URL is empty")
	}

	payload := BarkRequest{
		Title: title,
		Body:  body,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Post(apiUrl, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("bark API returned status code: %d", resp.StatusCode)
	}

	return nil
}
