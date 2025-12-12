package users

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type UserDeviceService struct {
	db *gorm.DB
}

var (
	ErrDeviceNotFound      = errors.New("device not found")
	ErrInvalidRefreshToken = errors.New("invalid or expired refresh token")
	ErrRefreshTokenExpired = errors.New("refresh token has expired")
)

func NewUserDeviceService(db *gorm.DB) *UserDeviceService {
	return &UserDeviceService{
		db: db,
	}
}

// CreateDevice creates a new device record with a refresh token
func (s *UserDeviceService) CreateDevice(userID uint, deviceName, deviceType, ipAddress, userAgent string, expiryDuration time.Duration) (*UserDevice, error) {
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	device := UserDevice{
		UserID:       userID,
		RefreshToken: refreshToken,
		DeviceName:   deviceName,
		DeviceType:   deviceType,
		IpAddress:    ipAddress,
		UserAgent:    userAgent,
		LastUsedAt:   time.Now(),
		ExpiresAt:    time.Now().Add(expiryDuration),
	}

	if err := s.db.Create(&device).Error; err != nil {
		return nil, fmt.Errorf("failed to create device: %w", err)
	}

	return &device, nil
}

// GetDeviceByRefreshToken retrieves a device by its refresh token
func (s *UserDeviceService) GetDeviceByRefreshToken(refreshToken string) (*UserDevice, error) {
	var device UserDevice
	if err := s.db.Where("refresh_token = ?", refreshToken).First(&device).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidRefreshToken
		}
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	// Check if token is expired
	if time.Now().After(device.ExpiresAt) {
		return nil, ErrRefreshTokenExpired
	}

	return &device, nil
}

// UpdateDeviceLastUsed updates the last used timestamp
func (s *UserDeviceService) UpdateDeviceLastUsed(deviceID uint) error {
	if err := s.db.Model(&UserDevice{}).Where("id = ?", deviceID).Update("last_used_at", time.Now()).Error; err != nil {
		return fmt.Errorf("failed to update device last used: %w", err)
	}
	return nil
}

// RefreshDeviceToken creates a new refresh token for an existing device
func (s *UserDeviceService) RefreshDeviceToken(deviceID uint, expiryDuration time.Duration) (*UserDevice, error) {
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	var device UserDevice
	if err := s.db.First(&device, deviceID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	device.RefreshToken = refreshToken
	device.ExpiresAt = time.Now().Add(expiryDuration)
	device.LastUsedAt = time.Now()

	if err := s.db.Save(&device).Error; err != nil {
		return nil, fmt.Errorf("failed to update device token: %w", err)
	}

	return &device, nil
}

// GetUserDevices retrieves all devices for a user
func (s *UserDeviceService) GetUserDevices(userID uint) ([]UserDevice, error) {
	var devices []UserDevice
	if err := s.db.Where("user_id = ?", userID).Order("last_used_at DESC").Find(&devices).Error; err != nil {
		return nil, fmt.Errorf("failed to get user devices: %w", err)
	}

	return devices, nil
}

// DeleteDevice removes a device
func (s *UserDeviceService) DeleteDevice(userID, deviceID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", deviceID, userID).Delete(&UserDevice{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete device: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrDeviceNotFound
	}

	return nil
}

// DeleteDeviceByRefreshToken removes a device by its refresh token
func (s *UserDeviceService) DeleteDeviceByRefreshToken(refreshToken string) error {
	result := s.db.Where("refresh_token = ?", refreshToken).Delete(&UserDevice{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete device: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrDeviceNotFound
	}

	return nil
}

// DeleteAllUserDevices removes all devices for a user
func (s *UserDeviceService) DeleteAllUserDevices(userID uint) error {
	if err := s.db.Where("user_id = ?", userID).Delete(&UserDevice{}).Error; err != nil {
		return fmt.Errorf("failed to delete user devices: %w", err)
	}
	return nil
}

// CleanupExpiredTokens removes all expired refresh tokens
func (s *UserDeviceService) CleanupExpiredTokens() error {
	if err := s.db.Where("expires_at < ?", time.Now()).Delete(&UserDevice{}).Error; err != nil {
		return fmt.Errorf("failed to cleanup expired tokens: %w", err)
	}
	return nil
}

// generateRefreshToken generates a secure random refresh token
func (s *UserDeviceService) generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
