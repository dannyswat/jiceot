package users

import (
	"net/http"
	"reflect"
	"strconv"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	userService *UserService
}

func NewUserHandler(userService *UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// getUserIDFromContext extracts user ID from the JWT token in context using reflection
func getUserIDFromContext(c echo.Context) uint {
	token, ok := c.Get("user").(*jwt.Token)
	if !ok {
		return 0
	}

	// Use reflection to extract UserID field regardless of the specific Claims type
	claimsValue := reflect.ValueOf(token.Claims)
	if claimsValue.Kind() == reflect.Ptr {
		claimsValue = claimsValue.Elem()
	}

	if claimsValue.Kind() == reflect.Struct {
		userIDField := claimsValue.FieldByName("UserID")
		if userIDField.IsValid() && userIDField.CanInterface() {
			if userID, ok := userIDField.Interface().(uint); ok {
				return userID
			}
		}
	}

	return 0
}

// DeleteUserAccount handles DELETE /api/user/account
func (h *UserHandler) DeleteUserAccount(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	err := h.userService.DeleteUserAccount(userID)
	if err != nil {
		if err == ErrUserNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete user account",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User account deleted successfully",
	})
}

// GetUser handles GET /api/users/:id (for admin purposes if needed)
func (h *UserHandler) GetUser(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	requestedUserID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid user ID",
		})
	}

	// Users can only view their own account (for now)
	if userID != uint(requestedUserID) {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "Access denied",
		})
	}

	user, err := h.userService.GetUser(uint(requestedUserID))
	if err != nil {
		if err == ErrUserNotFound {
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

// ListUsers handles GET /api/users (for admin purposes if needed)
func (h *UserHandler) ListUsers(c echo.Context) error {
	// For now, this is not implemented as there's no admin role
	// You could implement this later with proper authorization
	return c.JSON(http.StatusForbidden, map[string]string{
		"error": "Access denied",
	})
}
