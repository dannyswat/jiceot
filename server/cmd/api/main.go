package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	_ "time/tzdata"

	"dannyswat/jiceot/internal"
	"dannyswat/jiceot/internal/auth"
	"dannyswat/jiceot/internal/dashboard"
	"dannyswat/jiceot/internal/expenses"
	"dannyswat/jiceot/internal/notifications"
	"dannyswat/jiceot/internal/reports"
	"dannyswat/jiceot/internal/users"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gorm.io/driver/postgres"
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
	db, err := gorm.Open(postgres.Open(config.DatabaseURL), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := migrateSchema(db); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed successfully")

	// Initialize services
	passwordHasher := &users.BcryptPasswordHasher{}
	userService := users.NewUserService(db, passwordHasher)
	userDeviceService := users.NewUserDeviceService(db)
	walletService := expenses.NewWalletService(db)
	paymentService := expenses.NewPaymentService(db)
	expenseTypeService := expenses.NewExpenseTypeService(db)
	expenseService := expenses.NewExpenseService(db)
	dashboardService := dashboard.NewDashboardService(db)
	reportsService := reports.NewReportsService(db)
	notificationSettingService := notifications.NewNotificationSettingService(db)

	// Initialize handlers
	authHandler := auth.NewAuthHandler(userService, userDeviceService, config, auth.NewRateLimiter(5, 1))
	userHandler := users.NewUserHandler(userService)
	userDeviceHandler := users.NewUserDeviceHandler(userDeviceService)
	walletHandler := expenses.NewWalletHandler(walletService)
	paymentHandler := expenses.NewPaymentHandler(paymentService)
	expenseTypeHandler := expenses.NewExpenseTypeHandler(expenseTypeService)
	expenseHandler := expenses.NewExpenseHandler(expenseService)
	dashboardHandler := dashboard.NewDashboardHandler(dashboardService)
	reportsHandler := reports.NewReportsHandler(reportsService)
	notificationSettingHandler := notifications.NewNotificationSettingHandler(notificationSettingService)
	shortcutHandler := expenses.NewShortcutHandler(expenseService, expenseTypeService, walletService)

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
		Root: "client",
		Skipper: func(c echo.Context) bool {
			// Skip static serving for API routes
			return strings.HasPrefix(c.Request().URL.Path, "/api")
		},
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
	api.POST("/auth/refresh", authHandler.RefreshToken)

	// Protected routes (authentication required)
	protected := api.Group("")
	protected.Use(auth.JWTMiddleware(config))

	// Auth routes
	protected.GET("/auth/me", authHandler.Me)
	protected.POST("/auth/logout", authHandler.Logout)
	protected.PUT("/auth/password", authHandler.ChangePassword)

	// User routes
	protected.PUT("/user/preferences/currency", userHandler.UpdateCurrencySymbol)
	protected.PUT("/user/preferences/language", userHandler.UpdateLanguage)
	protected.POST("/user/preferences/automation-key/rotate", userHandler.RotateAutomationAPIKey)
	protected.DELETE("/user/account", userHandler.DeleteUserAccount)

	// Device management routes
	protected.GET("/devices", userDeviceHandler.ListUserDevices)
	protected.DELETE("/devices/:id", userDeviceHandler.DeleteDevice)
	protected.DELETE("/devices", userDeviceHandler.DeleteAllDevices)

	// Notification settings routes
	protected.GET("/notification-settings", notificationSettingHandler.GetSettings)
	protected.PUT("/notification-settings", notificationSettingHandler.UpdateSettings)
	protected.POST("/notification-settings/test", notificationSettingHandler.TestBark)

	// Dashboard routes
	protected.GET("/dashboard/stats", dashboardHandler.GetDashboardStats)
	protected.GET("/dashboard/due-wallets", dashboardHandler.GetDueWallets)
	protected.GET("/dashboard/due-expenses", dashboardHandler.GetDueExpenses)

	// Reports routes
	protected.GET("/reports/monthly", reportsHandler.GetMonthlyReport)
	protected.GET("/reports/yearly", reportsHandler.GetYearlyReport)

	// Wallet routes
	protected.GET("/wallets", walletHandler.ListWallets)
	protected.POST("/wallets", walletHandler.CreateWallet)
	protected.GET("/wallets/:id", walletHandler.GetWallet)
	protected.PUT("/wallets/:id", walletHandler.UpdateWallet)
	protected.DELETE("/wallets/:id", walletHandler.DeleteWallet)
	protected.POST("/wallets/:id/toggle", walletHandler.ToggleWallet)
	protected.GET("/wallets/:id/payments", walletHandler.GetWalletPayments)
	protected.GET("/wallets/:id/unbilled-expenses", walletHandler.GetUnbilledExpenses)

	// Payment routes
	protected.GET("/payments", paymentHandler.ListPayments)
	protected.POST("/payments", paymentHandler.CreatePayment)
	protected.GET("/payments/monthly-total", paymentHandler.GetMonthlyTotal)
	protected.GET("/payments/:id", paymentHandler.GetPayment)
	protected.PUT("/payments/:id", paymentHandler.UpdatePayment)
	protected.DELETE("/payments/:id", paymentHandler.DeletePayment)

	// Expense Type routes
	protected.GET("/expense-types", expenseTypeHandler.ListExpenseTypes)
	protected.POST("/expense-types", expenseTypeHandler.CreateExpenseType)
	protected.GET("/expense-types/tree", expenseTypeHandler.GetExpenseTypeTree)
	protected.GET("/expense-types/:id", expenseTypeHandler.GetExpenseType)
	protected.PUT("/expense-types/:id", expenseTypeHandler.UpdateExpenseType)
	protected.PUT("/expense-types/:id/postpone", expenseTypeHandler.PostponeExpenseType)
	protected.DELETE("/expense-types/:id", expenseTypeHandler.DeleteExpenseType)
	protected.POST("/expense-types/:id/toggle", expenseTypeHandler.ToggleExpenseType)

	// Expense routes
	protected.GET("/expenses", expenseHandler.ListExpenses)
	protected.POST("/expenses", expenseHandler.CreateExpense)
	protected.GET("/expenses/by-date", expenseHandler.GetExpensesByDate)
	protected.GET("/expenses/:id", expenseHandler.GetExpense)
	protected.PUT("/expenses/:id", expenseHandler.UpdateExpense)
	protected.DELETE("/expenses/:id", expenseHandler.DeleteExpense)

	// Automation routes (per-user automation API key via query string)
	automation := api.Group("/automation")
	automation.Use(auth.AutomationAPIKeyMiddleware(userService))
	automation.POST("/expense", shortcutHandler.CreateAutomationExpense)

	// Start background notifier
	notifier := notifications.NewNotifier(db)
	notifier.Start()
	defer notifier.Stop()

	// Start server
	e.GET("*", func(c echo.Context) error {
		c.Response().Header().Set(echo.HeaderCacheControl, "no-cache, no-store, must-revalidate")
		return c.File("client/index.html")
	})

	e.Logger.Printf("Server started at port %s", config.Port)
	e.Logger.Fatal(e.Start(":" + config.Port))
}

func migrateSchema(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&users.User{},
		&users.UserDevice{},
		&expenses.Wallet{},
		&expenses.ExpenseType{},
		&expenses.Payment{},
		&expenses.Expense{},
		&notifications.NotificationSetting{},
	); err != nil {
		return err
	}

	type migrationConstraint struct {
		model any
		name  string
	}

	constraints := []migrationConstraint{
		{model: &users.UserDevice{}, name: "User"},
		{model: &expenses.Wallet{}, name: "DefaultExpenseType"},
		{model: &expenses.ExpenseType{}, name: "Parent"},
		{model: &expenses.ExpenseType{}, name: "DefaultWallet"},
		{model: &expenses.Payment{}, name: "Wallet"},
		{model: &expenses.Expense{}, name: "ExpenseType"},
		{model: &expenses.Expense{}, name: "Wallet"},
		{model: &expenses.Expense{}, name: "Payment"},
	}

	for _, constraint := range constraints {
		if db.Migrator().HasConstraint(constraint.model, constraint.name) {
			continue
		}

		if err := db.Migrator().CreateConstraint(constraint.model, constraint.name); err != nil {
			return fmt.Errorf("create constraint %T.%s: %w", constraint.model, constraint.name, err)
		}
	}

	return nil
}
