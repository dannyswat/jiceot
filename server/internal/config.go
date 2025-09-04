package internal

import (
	"os"
	"time"
)

type Config struct {
	// Server
	Port string

	// Database
	DBPath string

	// JWT
	JWTSecret string
	JWTExpiry time.Duration
}

func LoadConfig() *Config {
	return &Config{
		Port:      getEnv("PORT", "8080"),
		DBPath:    getEnv("DB_PATH", "./data/jiceot.db"),
		JWTSecret: getSecret(),
		JWTExpiry: getDurationEnv("JWT_EXPIRY", "24h"),
	}
}

func getSecret() string {
	path := "./data/secret.key"
	if _, err := os.Stat(path); os.IsNotExist(err) {
		secret := generateRandomSecret(32)
		os.MkdirAll("./data", 0o755)
		if err := os.WriteFile(path, []byte(secret), 0o600); err != nil {
			panic("Failed to write secret key: " + err.Error())
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		panic("Failed to read secret key: " + err.Error())
	}

	if len(data) == 0 {
		panic("Secret key is empty")
	}

	return string(data)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getDurationEnv(key, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	duration, _ := time.ParseDuration(defaultValue)
	return duration
}

// generateRandomSecret generates a random string of the given length using crypto/rand.
func generateRandomSecret(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[int(time.Now().UnixNano())%len(charset)]
	}
	return string(b)
}
