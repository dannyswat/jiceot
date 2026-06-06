package main

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestPrecompressedStaticMiddlewareServesGzipAssetDirectly(t *testing.T) {
	root := t.TempDir()
	writeTestAsset(t, root, "index.html", []byte("<html><body>ok</body></html>"))
	writeTestGzipAsset(t, filepath.Join(root, "index.html.gz"), []byte("<html><body>ok</body></html>"))

	e := echo.New()
	e.Use(precompressedStaticMiddleware(root))
	e.GET("*", func(c echo.Context) error {
		return c.String(http.StatusOK, "plain fallback")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(echo.HeaderAcceptEncoding, "gzip")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get(echo.HeaderContentEncoding); got != "gzip" {
		t.Fatalf("content-encoding = %q, want %q", got, "gzip")
	}
	decoded := decodeGzip(t, rec.Body.Bytes())
	if string(decoded) != "<html><body>ok</body></html>" {
		t.Fatalf("decoded body = %q, want %q", string(decoded), "<html><body>ok</body></html>")
	}
	if bytes.Contains(rec.Body.Bytes(), []byte("plain fallback")) {
		t.Fatalf("response body unexpectedly came from the fallback handler")
	}
	if got := rec.Header().Get(echo.HeaderCacheControl); got != "no-cache, no-store, must-revalidate" {
		t.Fatalf("cache-control = %q, want %q", got, "no-cache, no-store, must-revalidate")
	}
}

func TestPrecompressedStaticMiddlewareFallsThroughWithoutGzipSupport(t *testing.T) {
	root := t.TempDir()
	writeTestAsset(t, root, "index.html", []byte("<html><body>ok</body></html>"))
	writeTestGzipAsset(t, filepath.Join(root, "index.html.gz"), []byte("<html><body>ok</body></html>"))

	e := echo.New()
	e.Use(precompressedStaticMiddleware(root))
	e.GET("*", func(c echo.Context) error {
		return c.String(http.StatusOK, "plain fallback")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get(echo.HeaderContentEncoding); got != "" {
		t.Fatalf("content-encoding = %q, want empty", got)
	}
	if got := rec.Body.String(); got != "plain fallback" {
		t.Fatalf("body = %q, want %q", got, "plain fallback")
	}
}

func writeTestAsset(t *testing.T, root, name string, content []byte) {
	t.Helper()

	assetPath := filepath.Join(root, name)
	if err := os.MkdirAll(filepath.Dir(assetPath), 0o755); err != nil {
		t.Fatalf("mkdir asset dir: %v", err)
	}
	if err := os.WriteFile(assetPath, content, 0o644); err != nil {
		t.Fatalf("write asset: %v", err)
	}
}

func writeTestGzipAsset(t *testing.T, assetPath string, content []byte) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(assetPath), 0o755); err != nil {
		t.Fatalf("mkdir gzip asset dir: %v", err)
	}

	file, err := os.Create(assetPath)
	if err != nil {
		t.Fatalf("create gzip asset: %v", err)
	}
	defer file.Close()

	writer := gzip.NewWriter(file)
	if _, err := writer.Write(content); err != nil {
		t.Fatalf("write gzip asset: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close gzip writer: %v", err)
	}
}

func decodeGzip(t *testing.T, data []byte) []byte {
	t.Helper()

	reader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("create gzip reader: %v", err)
	}
	defer reader.Close()

	decoded, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read gzip body: %v", err)
	}

	return decoded
}
