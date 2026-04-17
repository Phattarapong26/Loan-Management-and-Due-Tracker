#!/bin/bash

# Setup Redis for Development
# This script installs and configures Redis for local development

echo "🚀 Setting up Redis..."

# Check if Redis is already installed
if command -v redis-server &> /dev/null; then
    echo "✅ Redis is already installed"
    redis-server --version
else
    echo "📦 Installing Redis..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install -y redis-server
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please install Redis manually: https://redis.io/download"
        exit 1
    fi
fi

# Start Redis
echo "🔄 Starting Redis..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew services start redis
    echo "✅ Redis started (brew services)"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    echo "✅ Redis started (systemctl)"
fi

# Test Redis connection
echo "🧪 Testing Redis connection..."
sleep 2
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is running and responding"
else
    echo "❌ Redis is not responding"
    exit 1
fi

# Show Redis info
echo ""
echo "📊 Redis Info:"
redis-cli INFO server | grep "redis_version"
redis-cli INFO server | grep "os"
redis-cli INFO server | grep "tcp_port"

echo ""
echo "✨ Redis setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env file:"
echo "      REDIS_URL=redis://localhost:6379"
echo ""
echo "   2. Restart your backend server:"
echo "      npm run dev"
echo ""
echo "   3. Monitor Redis:"
echo "      redis-cli monitor"
echo ""

