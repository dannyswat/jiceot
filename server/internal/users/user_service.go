package users

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type UserService struct {
	db             *gorm.DB
	passwordHasher PasswordHasher
}

type CreateUserRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Name     string `json:"name" validate:"required,min=1"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=6"`
}

type UserListResponse struct {
	Users []User `json:"users"`
	Total int64  `json:"total"`
}

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrEmailExists      = errors.New("email already exists")
	ErrInvalidPassword  = errors.New("invalid password")
	ErrEmptyEmail       = errors.New("email cannot be empty")
	ErrEmptyName        = errors.New("name cannot be empty")
	ErrPasswordTooShort = errors.New("password must be at least 6 characters")
)

func NewUserService(db *gorm.DB, passwordHasher PasswordHasher) *UserService {
	return &UserService{
		db:             db,
		passwordHasher: passwordHasher,
	}
}

// Register creates a new user with the provided information
func (s *UserService) Register(req CreateUserRequest) (*User, error) {
	// Validate input
	if err := s.validateCreateUserRequest(req); err != nil {
		return nil, err
	}

	// Check if email already exists
	var existingUser User
	if err := s.db.Where("email = ?", strings.ToLower(req.Email)).First(&existingUser).Error; err == nil {
		return nil, ErrEmailExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing email: %w", err)
	}

	// Hash password
	hashedPassword, err := s.passwordHasher.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := User{
		Email:        strings.ToLower(req.Email),
		PasswordHash: hashedPassword,
		Name:         strings.TrimSpace(req.Name),
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// ChangePassword changes the password for a user
func (s *UserService) ChangePassword(userID uint, req ChangePasswordRequest) error {
	// Validate input
	if err := s.validateChangePasswordRequest(req); err != nil {
		return err
	}

	// Get user
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Verify current password
	if err := s.passwordHasher.CompareHashAndPassword(user.PasswordHash, req.CurrentPassword); err != nil {
		return ErrInvalidPassword
	}

	// Hash new password
	hashedPassword, err := s.passwordHasher.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password
	if err := s.db.Model(&user).Update("password_hash", hashedPassword).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// ListUsers returns a paginated list of users
func (s *UserService) ListUsers(limit, offset int) (*UserListResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var users []User
	var total int64

	// Get total count
	if err := s.db.Model(&User{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	// Get users with pagination
	if err := s.db.Limit(limit).Offset(offset).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	return &UserListResponse{
		Users: users,
		Total: total,
	}, nil
}

// GetUser returns a user by ID
func (s *UserService) GetUser(userID uint) (*User, error) {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// GetUserByEmail returns a user by email address
func (s *UserService) GetUserByEmail(email string) (*User, error) {
	var user User
	if err := s.db.Where("email = ?", strings.ToLower(email)).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return &user, nil
}

// ValidatePassword validates a password against a user's stored hash
func (s *UserService) ValidatePassword(user *User, password string) error {
	return s.passwordHasher.CompareHashAndPassword(user.PasswordHash, password)
}

// Authenticate validates user credentials and returns the user if successful
func (s *UserService) Authenticate(email, password string) (*User, error) {
	// Validate input
	if strings.TrimSpace(email) == "" {
		return nil, ErrEmptyEmail
	}
	if password == "" {
		return nil, ErrInvalidPassword
	}

	// Get user by email
	user, err := s.GetUserByEmail(email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrInvalidPassword // Don't reveal that email doesn't exist
		}
		return nil, fmt.Errorf("failed to authenticate user: %w", err)
	}

	// Validate password
	if err := s.ValidatePassword(user, password); err != nil {
		return nil, ErrInvalidPassword
	}

	return user, nil
}

// validateCreateUserRequest validates the create user request
func (s *UserService) validateCreateUserRequest(req CreateUserRequest) error {
	if strings.TrimSpace(req.Email) == "" {
		return ErrEmptyEmail
	}
	if strings.TrimSpace(req.Name) == "" {
		return ErrEmptyName
	}
	if len(req.Password) < 6 {
		return ErrPasswordTooShort
	}
	return nil
}

// validateChangePasswordRequest validates the change password request
func (s *UserService) validateChangePasswordRequest(req ChangePasswordRequest) error {
	if len(req.NewPassword) < 6 {
		return ErrPasswordTooShort
	}
	if req.CurrentPassword == "" {
		return ErrInvalidPassword
	}
	return nil
}
