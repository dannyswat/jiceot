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
	userService   *users.UserService
	deviceService *users.UserDeviceService
	config        *internal.Config
	rateLimiter   *RateLimiter
}

type LoginRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required"`
	DeviceName string `json:"device_name"` // Optional device name
	DeviceType string `json:"device_type"` // Optional: "web", "ios", "android"
}

type LoginResponse struct {
	Token        string     `json:"token"`
	RefreshToken string     `json:"refresh_token"`
	ExpiresAt    time.Time  `json:"expires_at"`
	User         users.User `json:"user"`
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func NewAuthHandler(
	userService *users.UserService,
	deviceService *users.UserDeviceService,
	config *internal.Config,
	rateLimiter *RateLimiter) *AuthHandler {

	return &AuthHandler{
		userService:   userService,
		deviceService: deviceService,
		config:        config,
		rateLimiter:   rateLimiter,
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

	// Create device record with refresh token
	deviceName := req.DeviceName
	if deviceName == "" {
		deviceName = "Unknown Device"
	}
	deviceType := req.DeviceType
	if deviceType == "" {
		deviceType = "web"
	}

	ipAddress := c.RealIP()
	userAgent := c.Request().UserAgent()
	refreshTokenExpiry := 30 * 24 * time.Hour // 30 days

	device, err := h.deviceService.CreateDevice(
		user.ID,
		deviceName,
		deviceType,
		ipAddress,
		userAgent,
		refreshTokenExpiry,
	)
	if err != nil {
		// Log error but don't fail the login
		c.Logger().Error("Failed to create device record:", err)
	}

	refreshToken := ""
	if device != nil {
		refreshToken = device.RefreshToken
		// Set refresh token as HTTP-only cookie
		c.SetCookie(&http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			Expires:  time.Now().Add(30 * 24 * time.Hour),
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // Set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
		})
	}

	return c.JSON(http.StatusOK, LoginResponse{
		Token:        tokenString,
		RefreshToken: "", // Don't send in response, use cookie instead
		ExpiresAt:    expiresAt,
		User:         *user,
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

	// Create initial device record for new user
	deviceName := "Initial Device"
	deviceType := "web"
	ipAddress := c.RealIP()
	userAgent := c.Request().UserAgent()
	refreshTokenExpiry := 30 * 24 * time.Hour // 30 days

	device, err := h.deviceService.CreateDevice(
		user.ID,
		deviceName,
		deviceType,
		ipAddress,
		userAgent,
		refreshTokenExpiry,
	)
	if err != nil {
		// Log error but don't fail the registration
		c.Logger().Error("Failed to create device record:", err)
	}

	refreshToken := ""
	if device != nil {
		refreshToken = device.RefreshToken
		// Set refresh token as HTTP-only cookie
		c.SetCookie(&http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			Expires:  time.Now().Add(30 * 24 * time.Hour),
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // Set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
		})
	}

	return c.JSON(http.StatusCreated, LoginResponse{
		Token:        tokenString,
		RefreshToken: "", // Don't send in response, use cookie instead
		ExpiresAt:    expiresAt,
		User:         *user,
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
	// Get refresh token from cookie
	refreshToken := ""
	if cookie, err := c.Cookie("refresh_token"); err == nil {
		refreshToken = cookie.Value
	}

	if refreshToken != "" {
		// Delete the device associated with this refresh token
		if err := h.deviceService.DeleteDeviceByRefreshToken(refreshToken); err != nil {
			c.Logger().Error("Failed to delete device on logout:", err)
		}
	}

	// Clear the refresh token cookie
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}

// RefreshToken handles refresh token requests to get a new access token
func (h *AuthHandler) RefreshToken(c echo.Context) error {
	// Get refresh token from cookie
	refreshToken := ""
	if cookie, err := c.Cookie("refresh_token"); err == nil {
		refreshToken = cookie.Value
	}

	if refreshToken == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Refresh token not found",
		})
	}

	// Verify refresh token and get device
	device, err := h.deviceService.GetDeviceByRefreshToken(refreshToken)
	if err != nil {
		if err == users.ErrInvalidRefreshToken || err == users.ErrRefreshTokenExpired {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid or expired refresh token",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to verify refresh token",
		})
	}

	// Get user
	user, err := h.userService.GetUser(device.UserID)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not found",
		})
	}

	// Generate new JWT access token
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

	// Update device last used timestamp
	if err := h.deviceService.UpdateDeviceLastUsed(device.ID); err != nil {
		c.Logger().Error("Failed to update device last used:", err)
	}

	// Optionally rotate refresh token (for enhanced security)
	refreshTokenExpiry := 30 * 24 * time.Hour // 30 days
	newDevice, err := h.deviceService.RefreshDeviceToken(device.ID, refreshTokenExpiry)
	if err != nil {
		c.Logger().Error("Failed to rotate refresh token:", err)
		// Don't fail the request, just return the access token with old refresh token
		return c.JSON(http.StatusOK, LoginResponse{
			Token:        tokenString,
			RefreshToken: "",
			ExpiresAt:    expiresAt,
			User:         *user,
		})
	}

	// Set new refresh token cookie
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    newDevice.RefreshToken,
		Expires:  time.Now().Add(30 * 24 * time.Hour),
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
	})

	return c.JSON(http.StatusOK, LoginResponse{
		Token:        tokenString,
		RefreshToken: "", // Don't send in response, use cookie instead
		ExpiresAt:    expiresAt,
		User:         *user,
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
