#!/bin/bash

# Build script for Jiceot application
# Builds both client and server for production deployment

set -e  # Exit on any error

echo "🏗️  Building Jiceot Application..."
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
mkdir -p dist/client

# Build the client
echo "📦 Building client..."
cd client2
npm install
npm run build
cd ..
echo "✅ Client build completed"

# Build the server
echo "🔧 Building server..."
cd server
go mod tidy
go build -o ../dist/jiceot-server cmd/api/main.go
cd ..
echo "✅ Server build completed"

# Copy server assets
echo "📄 Copying server assets..."
if [ -f server/.env ]; then
    cp server/.env dist/.env
    echo "✅ Environment file copied"
fi

# Create start script
echo "📝 Creating start script..."
cat > dist/start.sh << 'EOF'
#!/bin/bash
# Start Jiceot server
# The server will serve the client files from ./client directory

echo "🚀 Starting Jiceot server..."
./jiceot-server
EOF

chmod +x dist/start.sh
echo "✅ Start script created"

echo ""
echo "🎉 Build completed successfully!"
echo "📁 Files are in the 'dist' directory"
echo "🚀 Run './start.sh' from the dist directory to start the server"
echo ""
echo "Build contents:"
echo "  dist/"
echo "  ├── jiceot-server       # Server executable"
echo "  ├── client/             # Client static files"
echo "  ├── .env                # Environment config (if exists)"
echo "  └── start.sh            # Start script"
