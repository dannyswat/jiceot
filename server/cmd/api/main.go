package main

import (
	"log"
	"net/http"

	"dannyswat/jiceot/internal"
	"dannyswat/jiceot/internal/auth"
	"dannyswat/jiceot/internal/bills"
	"dannyswat/jiceot/internal/expenses"
	"dannyswat/jiceot/internal/users"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Load configuration
	config := internal.LoadConfig()

	// Initialize database
	db, err := gorm.Open(sqlite.Open(config.DBPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(
		&users.User{},
		&bills.BillType{},
		&bills.BillPayment{},
		&expenses.ExpenseType{},
		&expenses.ExpenseItem{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed successfully")

	// Initialize services
	passwordHasher := &users.BcryptPasswordHasher{}
	userService := users.NewUserService(db, passwordHasher)
	billTypeService := bills.NewBillTypeService(db)

	// Initialize handlers
	authHandler := auth.NewAuthHandler(userService, config)
	billTypeHandler := bills.NewBillTypeHandler(billTypeService)

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{config.FrontendURL},
		AllowMethods: []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// Health check route
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "jiceot-api",
		})
	})

	// API routes
	api := e.Group("/api")

	// Public routes (no authentication required)
	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/register", authHandler.Register)

	// Protected routes (authentication required)
	protected := api.Group("")
	protected.Use(auth.JWTMiddleware(config))

	// Auth routes
	protected.GET("/auth/me", authHandler.Me)
	protected.POST("/auth/logout", authHandler.Logout)
	protected.PUT("/auth/password", authHandler.ChangePassword)

	// Bill Type routes
	protected.GET("/bill-types", billTypeHandler.ListBillTypes)
	protected.POST("/bill-types", billTypeHandler.CreateBillType)
	protected.GET("/bill-types/:id", billTypeHandler.GetBillType)
	protected.PUT("/bill-types/:id", billTypeHandler.UpdateBillType)
	protected.DELETE("/bill-types/:id", billTypeHandler.DeleteBillType)
	protected.POST("/bill-types/:id/toggle", billTypeHandler.ToggleBillType)

	// API info route
	api.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"message": "Jiceot API",
			"version": "1.0.0",
		})
	})

	// Start server
	log.Printf("Starting server on port %s", config.Port)
	log.Fatal(e.Start(":" + config.Port))
}
