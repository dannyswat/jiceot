package auth

import (
	"errors"
	"net/http"

	"dannyswat/jiceot/internal"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
)

var ErrTokenInvalid = errors.New("token is invalid")

// JWTMiddleware creates and returns the JWT middleware
func JWTMiddleware(config *internal.Config) echo.MiddlewareFunc {
	return echojwt.WithConfig(echojwt.Config{
		SigningKey:  []byte(config.JWTSecret),
		TokenLookup: "header:Authorization:Bearer ",
		ParseTokenFunc: func(c echo.Context, auth string) (interface{}, error) {
			keyFunc := func(t *jwt.Token) (interface{}, error) {
				if t.Method.Alg() != "HS256" {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(config.JWTSecret), nil
			}

			token, err := jwt.ParseWithClaims(auth, &Claims{}, keyFunc)
			if err != nil {
				return nil, err
			}
			if !token.Valid {
				return nil, ErrTokenInvalid
			}
			return token, nil
		},
		ErrorHandler: func(c echo.Context, err error) error {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid or expired token",
			})
		},
	})
}

// OptionalJWTMiddleware creates a middleware that validates JWT if present but doesn't require it
func OptionalJWTMiddleware(config *internal.Config) echo.MiddlewareFunc {
	return echojwt.WithConfig(echojwt.Config{
		SigningKey:  []byte(config.JWTSecret),
		TokenLookup: "header:Authorization:Bearer ",
		ParseTokenFunc: func(c echo.Context, auth string) (interface{}, error) {
			keyFunc := func(t *jwt.Token) (interface{}, error) {
				if t.Method.Alg() != "HS256" {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(config.JWTSecret), nil
			}

			token, err := jwt.ParseWithClaims(auth, &Claims{}, keyFunc)
			if err != nil {
				return nil, err
			}
			if !token.Valid {
				return nil, ErrTokenInvalid
			}
			return token, nil
		},
		Skipper: func(c echo.Context) bool {
			// Skip validation if no Authorization header is present
			auth := c.Request().Header.Get("Authorization")
			return auth == ""
		},
		ErrorHandler: func(c echo.Context, err error) error {
			// For optional middleware, we don't return an error
			// Just continue without setting the user context
			return nil
		},
	})
}
