#!/bin/bash
# Antigravity Manager Headless 开发模式启动脚本
# 同时启动 Vite 预览服务器和 Rust 后端

echo "Starting Antigravity Manager in development headless mode..."
echo ""

# 检查是否设置了 API Key
if [ -z "$API_KEY" ]; then
    echo "Warning: API_KEY not set."
    echo "To set API_KEY, run: export API_KEY=sk-your-api-key"
    echo ""
fi

# 进入项目目录
cd "$(dirname "$0")/.."

# 先构建前端
echo "Building frontend..."
npm run build

# 启动 Vite 预览服务器（在后台）
echo "Starting Vite preview server on port 1420..."
npx vite preview --port 1420 &
VITE_PID=$!

# 等待 Vite 启动
sleep 2

# 设置环境变量，让后端指向 Vite 预览服务器
export ABV_DEV_FRONTEND_URL="http://localhost:1420"

echo ""
echo "Starting Rust backend in headless mode..."
echo "Web UI will be available at: http://localhost:8045"
echo "Press Ctrl+C to stop"
echo ""

# 启动 Rust 后端
cd src-tauri && cargo run --release

# 清理：停止 Vite 预览服务器
echo "Stopping Vite preview server..."
kill $VITE_PID 2>/dev/null