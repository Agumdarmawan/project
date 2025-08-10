#!/bin/bash

echo "🚀 Setting up QR Attendance Tracker..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating environment file..."
    cp .env.example .env
    echo "✅ Environment file created. Please edit server/.env with your configuration."
fi

# Initialize database
echo "🗄️  Initializing database..."
npm run init-db

cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your configuration"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Default super admin credentials:"
echo "Username: superadmin"
echo "Password: admin123"
echo ""
echo "Happy coding! 🚀"