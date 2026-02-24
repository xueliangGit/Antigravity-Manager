# Antigravity Manager Headless 模式修改文档

## 概述
将 Antigravity Manager 从桌面应用改为 Headless 模式，启动后自动在后台运行服务，通过浏览器访问 Web 界面。

## 选择 Headless 模式的原因

### 1. 解决 macOS 兼容性问题
- **问题**：macOS 13.4 及更低版本的 WebKit 存在 IPC 通信 Bug，导致 Tauri v2 应用前端无响应
- **方案**：Headless 模式完全绕过 Tauri 的 WebKit IPC，使用 HTTP 协议通信
- **优势**：支持旧版本 macOS，无需升级系统

### 2. 资源占用更低
| 模式 | 内存占用 | 说明 |
|------|---------|------|
| 桌面模式 | 300-500MB | 包含 WebKit 渲染引擎 |
| Headless 模式 | 50-100MB | 仅 Rust 后端，无 GUI 渲染 |

- **节省 60-75% 内存**
- **无 GPU 加速需求**
- **适合长期后台运行**

### 3. 使用系统浏览器
- **桌面模式**：使用内置 WebKit，版本受限
- **Headless 模式**：使用用户安装的 Chrome/Safari/Firefox
  - 更好的开发者工具支持
  - 用户熟悉的浏览体验
  - 自动同步浏览器插件和密码

### 4. 部署灵活性
- **服务器部署**：可在无 GUI 的服务器上运行
- **Docker 兼容**：更容易容器化
- **远程访问**：通过局域网或公网访问 Web 界面

### 5. 开发与维护优势
- **前后端分离**：前端可以独立开发和更新
- **调试便利**：可直接在浏览器中调试前端
- **热更新支持**：前端修改无需重启应用

---

## 修改文件列表

### 1. `src-tauri/tauri.conf.json`
**修改内容：**
- 应用名称改为 `"Antigravity Tools Headless"`
- `windows: []` - 移除窗口配置，不创建 GUI 窗口
- 禁用自动更新插件 (`"active": false`)
- 构建目标改为 `["app", "dmg"]`

```json
{
  "productName": "Antigravity Tools Headless",
  "app": {
    "windows": []
  },
  "plugins": {
    "updater": {
      "active": false
    }
  }
}
```

---

### 2. `src-tauri/src/lib.rs`
**主要修改：**

#### 2.1 默认启动模式改为 Headless
```rust
pub fn run() {
    // 默认以 headless 模式启动，使用 --gui 参数启用 GUI
    let is_headless = !args.iter().any(|arg| arg == "--gui");
}
```

#### 2.2 自动检测 dist 目录
```rust
if is_headless {
    // 自动检测 dist 目录路径（支持打包后的 App）
    if std::env::var("ABV_DIST_PATH").is_err() {
        // 1. 尝试相对于可执行文件的路径
        // 2. 尝试当前目录路径
    }
}
```

#### 2.3 分离 Headless 和 GUI 启动逻辑
```rust
fn run_headless() {
    // 使用 Tauri Builder 但不创建窗口
    // 启动代理服务
    // 创建托盘图标
    // 自动打开浏览器
}

fn run_gui() {
    // 原始 GUI 模式代码
}
```

#### 2.4 Headless 模式自动打开浏览器
```rust
// 服务启动后 2 秒自动打开浏览器
tokio::spawn(async move {
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    // 根据平台使用 open/xdg-open/start 打开浏览器
});
```

---

### 3. `src-tauri/src/modules/tray.rs`
**修改内容：**

#### 3.1 修改托盘菜单文本
将 `"显示主窗口"` 改为 `"打开网页"`，支持多语言：
```rust
let open_web_text = match config.language.as_str() {
    "zh" | "zh-CN" => "打开网页",
    "zh-TW" => "打開網頁",
    "ja" => "ウェブを開く",
    // ... 其他语言
    _ => "Open Web",
};
```

#### 3.2 修改菜单点击行为
```rust
"show" => {
    // 打开浏览器而不是显示窗口
    let url = format!("http://localhost:{}", port);
    // 根据平台调用 open/xdg-open/start
}
```

#### 3.3 修改托盘图标左键点击行为
```rust
.on_tray_icon_event(move |tray, event| {
    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
        // 左键点击也打开浏览器
    }
})
```

---

### 4. `package.json`
**添加的脚本：**
```json
{
  "scripts": {
    "headless": "npm run build && cd src-tauri && cargo run --release",
    "headless:dev": "npm run build && cd src-tauri && cargo run",
    "headless:quick": "cd src-tauri && cargo run --release",
    "build:headless": "npm run build && cd src-tauri && cargo build --release",
    "build:headless:mac": "npm run build && tauri build --bundles app"
  }
}
```

---

## 使用方式

### 开发测试
```bash
# 完整模式（构建前端 + 启动服务）
npm run headless:dev

# 快速模式（假设前端已构建）
npm run headless:quick
```

### 生产构建
```bash
# 构建 macOS App
npm run build:headless:mac

# 构建可执行文件
npm run build:headless
```

### 访问应用
构建完成后，打开 App 会自动：
1. 在后台启动服务（端口 8045）
2. 自动打开浏览器访问 `http://localhost:8045`
3. 在菜单栏显示托盘图标

---

## 注意事项

1. **dist 目录**：确保 `npm run build` 已执行，生成 `dist` 目录
2. **路径检测**：代码会自动检测 `dist` 目录，支持开发和打包后环境
3. **环境变量**：可手动设置 `ABV_DIST_PATH` 指定静态资源路径
4. **托盘图标**：macOS/Windows 支持托盘图标，Linux Wayland 默认禁用

---

## 技术细节

### 静态文件服务
后端通过 `ABV_DIST_PATH` 环境变量指定前端静态资源目录，使用 `tower_http::services::ServeDir` 提供服务。

### 浏览器自动打开
使用平台特定命令：
- macOS: `open http://localhost:8045`
- Linux: `xdg-open http://localhost:8045`
- Windows: `cmd /C start http://localhost:8045`

### 托盘功能
- 显示当前账号和配额状态
- 快速切换账号
- 刷新配额
- 打开网页
- 退出应用