package auth

import (
	"net/http"
	"time"

	"dannyswat/jiceot/internal"
	"dannyswat/jiceot/internal/users"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	userService *users.UserService
	config      *internal.Config
	rateLimiter *RateLimiter
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token     string     `json:"token"`
	ExpiresAt time.Time  `json:"expires_at"`
	User      users.User `json:"user"`
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func NewAuthHandler(
	userService *users.UserService,
	config *internal.Config,
	rateLimiter *RateLimiter) *AuthHandler {

	return &AuthHandler{
		userService: userService,
		config:      config,
		rateLimiter: rateLimiter,
	}
}

// Login handles user authentication and JWT token generation
func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Check rate limit
	if !h.rateLimiter.AllowRequest(req.Email) {
		return c.JSON(http.StatusTooManyRequests, map[string]string{
			"error": "Rate limit exceeded",
		})
	}

	// Authenticate user
	user, err := h.userService.Authenticate(req.Email, req.Password)
	if err != nil {
		if err == users.ErrInvalidPassword || err == users.ErrEmptyEmail {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid email or password",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Internal server error",
		})
	}

	// Generate JWT token
	expiresAt := time.Now().Add(h.config.JWTExpiry)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "jiceot",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.config.JWTSecret))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate token",
		})
	}

	return c.JSON(http.StatusOK, LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User:      *user,
	})
}

// Register handles user registration
func (h *AuthHandler) Register(c echo.Context) error {
	var req users.CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Create user
	user, err := h.userService.Register(req)
	if err != nil {
		switch err {
		case users.ErrEmailExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Email already exists",
			})
		case users.ErrEmptyEmail, users.ErrEmptyName, users.ErrPasswordTooShort:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to create user",
			})
		}
	}

	// Generate JWT token for the new user
	expiresAt := time.Now().Add(h.config.JWTExpiry)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "jiceot",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.config.JWTSecret))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate token",
		})
	}

	return c.JSON(http.StatusCreated, LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User:      *user,
	})
}

// Me returns the current authenticated user's information
func (h *AuthHandler) Me(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	user, err := h.userService.GetUser(userID)
	if err != nil {
		if err == users.ErrUserNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user",
		})
	}

	return c.JSON(http.StatusOK, user)
}

// Logout handles user logout (client-side token invalidation)
func (h *AuthHandler) Logout(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}

// ChangePassword handles password change requests
func (h *AuthHandler) ChangePassword(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	var req users.ChangePasswordRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	err := h.userService.ChangePassword(userID, req)
	if err != nil {
		switch err {
		case users.ErrInvalidPassword:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Current password is incorrect",
			})
		case users.ErrPasswordTooShort:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "New password must be at least 6 characters",
			})
		case users.ErrUserNotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User not found",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to change password",
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Password changed successfully",
	})
}

// getUserIDFromContext extracts user ID from the JWT token in context
func getUserIDFromContext(c echo.Context) uint {
	token, ok := c.Get("user").(*jwt.Token)
	if !ok {
		return 0
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return 0
	}

	return claims.UserID
}

// GetUserIDFromContext is a public helper function to get user ID from context
func GetUserIDFromContext(c echo.Context) uint {
	return getUserIDFromContext(c)
}
