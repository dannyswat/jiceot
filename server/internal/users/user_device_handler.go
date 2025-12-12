package users

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type UserDeviceHandler struct {
	deviceService *UserDeviceService
}

func NewUserDeviceHandler(deviceService *UserDeviceService) *UserDeviceHandler {
	return &UserDeviceHandler{
		deviceService: deviceService,
	}
}

// ListUserDevices returns all devices for the authenticated user
func (h *UserDeviceHandler) ListUserDevices(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	devices, err := h.deviceService.GetUserDevices(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get devices",
		})
	}

	// Get current device's refresh token from cookie
	currentRefreshToken := ""
	if cookie, err := c.Cookie("refresh_token"); err == nil {
		currentRefreshToken = cookie.Value
	}

	// Convert to response format
	var responses []UserDeviceResponse
	for _, device := range devices {
		responses = append(responses, UserDeviceResponse{
			ID:         device.ID,
			DeviceName: device.DeviceName,
			DeviceType: device.DeviceType,
			IpAddress:  device.IpAddress,
			LastUsedAt: device.LastUsedAt,
			CreatedAt:  device.CreatedAt,
			IsCurrent:  device.RefreshToken == currentRefreshToken,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"devices": responses,
		"total":   len(responses),
	})
}

// DeleteDevice removes a specific device
func (h *UserDeviceHandler) DeleteDevice(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid device ID",
		})
	}

	if err := h.deviceService.DeleteDevice(userID, uint(deviceID)); err != nil {
		if err == ErrDeviceNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Device not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete device",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Device removed successfully",
	})
}

// DeleteAllDevices removes all devices for the user except the current one
func (h *UserDeviceHandler) DeleteAllDevices(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	// Get current device's refresh token from cookie
	currentRefreshToken := ""
	if cookie, err := c.Cookie("refresh_token"); err == nil {
		currentRefreshToken = cookie.Value
	}

	// Get all devices
	devices, err := h.deviceService.GetUserDevices(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get devices",
		})
	}

	// Delete all devices except current
	deletedCount := 0
	for _, device := range devices {
		if device.RefreshToken != currentRefreshToken {
			if err := h.deviceService.DeleteDevice(userID, device.ID); err == nil {
				deletedCount++
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Devices removed successfully",
		"count":   deletedCount,
	})
}
