package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"dannyswat/jiceot/internal"
	"dannyswat/jiceot/internal/auth"
	"dannyswat/jiceot/internal/expenses"
	"dannyswat/jiceot/internal/notifications"
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

	os.MkdirAll(filepath.Dir(config.DBPath), 0o755)
	// Initialize database
	db, err := gorm.Open(sqlite.Open(config.DBPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(
		&users.User{},
		&expenses.BillType{},
		&expenses.BillPayment{},
		&expenses.ExpenseType{},
		&expenses.ExpenseItem{},
		&notifications.UserNotificationSetting{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed successfully")

	// Initialize services
	passwordHasher := &users.BcryptPasswordHasher{}
	userService := users.NewUserService(db, passwordHasher)
	billTypeService := expenses.NewBillTypeService(db)
	billPaymentService := expenses.NewBillPaymentService(db)
	expenseTypeService := expenses.NewExpenseTypeService(db)
	expenseItemService := expenses.NewExpenseItemService(db)
	remindService := notifications.NewRemindService(db)
	userSettingService := notifications.NewUserSettingService(db)

	// Start background reminder service
	remindService.StartBackgroundReminders()

	// Setup graceful shutdown for reminder service
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down reminder service...")
		remindService.StopBackgroundReminders()
	}()

	// Initialize handlers
	authHandler := auth.NewAuthHandler(userService, config)
	billTypeHandler := expenses.NewBillTypeHandler(billTypeService)
	billPaymentHandler := expenses.NewBillPaymentHandler(billPaymentService, expenseItemService)
	expenseTypeHandler := expenses.NewExpenseTypeHandler(expenseTypeService)
	expenseItemHandler := expenses.NewExpenseItemHandler(expenseItemService)
	userSettingHandler := notifications.NewUserSettingHandler(userSettingService)

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// Health check route
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "jiceot-api",
		})
	})

	e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Root:       "client",
		Skipper:    nil,
		Index:      "index.html",
		Browse:     false,
		HTML5:      true,
		IgnoreBase: false,
		Filesystem: nil,
	}))

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
	protected.GET("/bill-types/:id/payments", billPaymentHandler.GetBillPaymentsByBillType)

	// Bill Payment routes
	protected.GET("/bill-payments", billPaymentHandler.ListBillPayments)
	protected.POST("/bill-payments", billPaymentHandler.CreateBillPayment)
	protected.GET("/bill-payments/:id", billPaymentHandler.GetBillPayment)
	protected.PUT("/bill-payments/:id", billPaymentHandler.UpdateBillPayment)
	protected.DELETE("/bill-payments/:id", billPaymentHandler.DeleteBillPayment)
	protected.GET("/bill-payments/monthly-total", billPaymentHandler.GetMonthlyTotal)

	// Expense Type routes
	protected.GET("/expense-types", expenseTypeHandler.ListExpenseTypes)
	protected.POST("/expense-types", expenseTypeHandler.CreateExpenseType)
	protected.GET("/expense-types/:id", expenseTypeHandler.GetExpenseType)
	protected.PUT("/expense-types/:id", expenseTypeHandler.UpdateExpenseType)
	protected.DELETE("/expense-types/:id", expenseTypeHandler.DeleteExpenseType)

	// Expense Item routes
	protected.GET("/expense-items", expenseItemHandler.ListExpenseItems)
	protected.POST("/expense-items", expenseItemHandler.CreateExpenseItem)
	protected.GET("/expense-items/:id", expenseItemHandler.GetExpenseItem)
	protected.PUT("/expense-items/:id", expenseItemHandler.UpdateExpenseItem)
	protected.DELETE("/expense-items/:id", expenseItemHandler.DeleteExpenseItem)
	protected.GET("/expense-items/monthly/:year/:month", expenseItemHandler.GetExpenseItemsByMonth)

	// Notification Settings routes
	protected.GET("/notifications/settings", userSettingHandler.GetUserSetting)
	protected.POST("/notifications/settings", userSettingHandler.CreateOrUpdateUserSetting)
	protected.POST("/notifications/test", userSettingHandler.TestNotification)
	protected.POST("/notifications/manual-reminder", userSettingHandler.TriggerManualReminder)

	// Start server
	e.GET("*", func(c echo.Context) error {
		c.Response().Header().Set(echo.HeaderCacheControl, "no-cache, no-store, must-revalidate")
		return c.File("client/index.html")
	})

	e.Logger.Printf("Server started at port %s", config.Port)
	e.Logger.Fatal(e.Start(":" + config.Port))
}
