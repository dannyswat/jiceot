package users

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&User{})
	require.NoError(t, err)

	return db
}

func TestUserService_Register(t *testing.T) {
	db := setupTestDB(t)
	passwordHasher := &BcryptPasswordHasher{}
	service := NewUserService(db, passwordHasher)

	t.Run("successful registration", func(t *testing.T) {
		req := CreateUserRequest{
			Email:    "test@example.com",
			Password: "password123",
			Name:     "Test User",
		}

		user, err := service.Register(req)
		require.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, "test@example.com", user.Email)
		assert.Equal(t, "Test User", user.Name)
		assert.NotEmpty(t, user.PasswordHash)
		assert.NotEqual(t, "password123", user.PasswordHash)
	})

	t.Run("duplicate email", func(t *testing.T) {
		req := CreateUserRequest{
			Email:    "test@example.com",
			Password: "password123",
			Name:     "Another User",
		}

		user, err := service.Register(req)
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, ErrEmailExists, err)
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			name string
			req  CreateUserRequest
			err  error
		}{
			{
				name: "empty email",
				req: CreateUserRequest{
					Email:    "",
					Password: "password123",
					Name:     "Test User",
				},
				err: ErrEmptyEmail,
			},
			{
				name: "empty name",
				req: CreateUserRequest{
					Email:    "test2@example.com",
					Password: "password123",
					Name:     "",
				},
				err: ErrEmptyName,
			},
			{
				name: "password too short",
				req: CreateUserRequest{
					Email:    "test3@example.com",
					Password: "12345",
					Name:     "Test User",
				},
				err: ErrPasswordTooShort,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				user, err := service.Register(tc.req)
				assert.Error(t, err)
				assert.Nil(t, user)
				assert.Equal(t, tc.err, err)
			})
		}
	})
}

func TestUserService_GetUser(t *testing.T) {
	db := setupTestDB(t)
	passwordHasher := &BcryptPasswordHasher{}
	service := NewUserService(db, passwordHasher)

	// Create a test user
	req := CreateUserRequest{
		Email:    "test@example.com",
		Password: "password123",
		Name:     "Test User",
	}
	createdUser, err := service.Register(req)
	require.NoError(t, err)

	t.Run("get existing user", func(t *testing.T) {
		user, err := service.GetUser(createdUser.ID)
		require.NoError(t, err)
		assert.Equal(t, createdUser.ID, user.ID)
		assert.Equal(t, createdUser.Email, user.Email)
		assert.Equal(t, createdUser.Name, user.Name)
	})

	t.Run("get non-existent user", func(t *testing.T) {
		user, err := service.GetUser(999)
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, ErrUserNotFound, err)
	})
}

func TestUserService_ChangePassword(t *testing.T) {
	db := setupTestDB(t)
	passwordHasher := &BcryptPasswordHasher{}
	service := NewUserService(db, passwordHasher)

	// Create a test user
	req := CreateUserRequest{
		Email:    "test@example.com",
		Password: "password123",
		Name:     "Test User",
	}
	user, err := service.Register(req)
	require.NoError(t, err)

	t.Run("successful password change", func(t *testing.T) {
		changeReq := ChangePasswordRequest{
			CurrentPassword: "password123",
			NewPassword:     "newpassword123",
		}

		err := service.ChangePassword(user.ID, changeReq)
		require.NoError(t, err)

		// Verify the password was changed
		updatedUser, err := service.GetUser(user.ID)
		require.NoError(t, err)

		err = service.ValidatePassword(updatedUser, "newpassword123")
		assert.NoError(t, err)

		err = service.ValidatePassword(updatedUser, "password123")
		assert.Error(t, err)
	})

	t.Run("wrong current password", func(t *testing.T) {
		changeReq := ChangePasswordRequest{
			CurrentPassword: "wrongpassword",
			NewPassword:     "newpassword123",
		}

		err := service.ChangePassword(user.ID, changeReq)
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidPassword, err)
	})

	t.Run("new password too short", func(t *testing.T) {
		changeReq := ChangePasswordRequest{
			CurrentPassword: "newpassword123",
			NewPassword:     "123",
		}

		err := service.ChangePassword(user.ID, changeReq)
		assert.Error(t, err)
		assert.Equal(t, ErrPasswordTooShort, err)
	})
}

func TestUserService_ListUsers(t *testing.T) {
	db := setupTestDB(t)
	passwordHasher := &BcryptPasswordHasher{}
	service := NewUserService(db, passwordHasher)

	// Create test users
	users := []CreateUserRequest{
		{Email: "user1@example.com", Password: "password123", Name: "User 1"},
		{Email: "user2@example.com", Password: "password123", Name: "User 2"},
		{Email: "user3@example.com", Password: "password123", Name: "User 3"},
	}

	for _, userReq := range users {
		_, err := service.Register(userReq)
		require.NoError(t, err)
	}

	t.Run("list all users", func(t *testing.T) {
		response, err := service.ListUsers(10, 0)
		require.NoError(t, err)
		assert.Equal(t, int64(3), response.Total)
		assert.Len(t, response.Users, 3)
	})

	t.Run("list with pagination", func(t *testing.T) {
		response, err := service.ListUsers(2, 0)
		require.NoError(t, err)
		assert.Equal(t, int64(3), response.Total)
		assert.Len(t, response.Users, 2)

		response, err = service.ListUsers(2, 2)
		require.NoError(t, err)
		assert.Equal(t, int64(3), response.Total)
		assert.Len(t, response.Users, 1)
	})
}

func TestUserService_Authenticate(t *testing.T) {
	db := setupTestDB(t)
	passwordHasher := &BcryptPasswordHasher{}
	service := NewUserService(db, passwordHasher)

	// Create a test user
	req := CreateUserRequest{
		Email:    "test@example.com",
		Password: "password123",
		Name:     "Test User",
	}
	createdUser, err := service.Register(req)
	require.NoError(t, err)

	t.Run("successful authentication", func(t *testing.T) {
		user, err := service.Authenticate("test@example.com", "password123")
		require.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, createdUser.ID, user.ID)
		assert.Equal(t, createdUser.Email, user.Email)
		assert.Equal(t, createdUser.Name, user.Name)
	})

	t.Run("case insensitive email", func(t *testing.T) {
		user, err := service.Authenticate("TEST@EXAMPLE.COM", "password123")
		require.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, createdUser.ID, user.ID)
	})

	t.Run("wrong password", func(t *testing.T) {
		user, err := service.Authenticate("test@example.com", "wrongpassword")
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, ErrInvalidPassword, err)
	})

	t.Run("non-existent email", func(t *testing.T) {
		user, err := service.Authenticate("nonexistent@example.com", "password123")
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, ErrInvalidPassword, err)
	})

	t.Run("empty email", func(t *testing.T) {
		user, err := service.Authenticate("", "password123")
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, ErrEmptyEmail, err)
	})

	t.Run("empty password", func(t *testing.T) {
		user, err := service.Authenticate("test@example.com", "")
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, ErrInvalidPassword, err)
	})
}
