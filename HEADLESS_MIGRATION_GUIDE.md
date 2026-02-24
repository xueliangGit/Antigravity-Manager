# 无头应用迁移指南

## 1. 什么是无头应用

无头应用（Headless App）是一种没有传统桌面界面的应用程序，它在后台运行并通过网络接口（如 HTTP API 或 Web 界面）提供服务。对于 Antigravity Tools 来说，无头模式意味着：

- 应用在后台运行，没有桌面窗口
- 通过浏览器访问 `http://localhost:8045` 使用 Web 界面
- 只在状态栏显示图标，不在程序坞中显示

## 2. 迁移步骤

### 步骤 1：更新 Tauri 配置文件

**文件**：`src-tauri/tauri.conf.json`

**修改内容**：在 `bundle` 部分添加 `resources` 配置，确保前端文件被包含在应用中

```json
{
  "bundle": {
    "active": true,
    "targets": ["app", "dmg"],
    "createUpdaterArtifacts": false,
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
    "resources": ["../dist"], // 添加这一行
    "macOS": {
      "entitlements": "Entitlements.plist"
    }
  }
}
```

### 步骤 2：更新前端文件路径检测

**文件**：`src-tauri/src/lib.rs`

**修改内容**：在 `run` 函数中添加对 macOS 应用包中 `Resources/_up_/dist/` 路径的检查

```rust
// 在 run 函数中，找到 macOS 路径检测部分
#[cfg(target_os = "macos")]
{
    // For macOS App Bundle
    let contents_dir = exe_dir.join("..");
    let resources_dir = contents_dir.join("Resources");

    possible_paths.push(resources_dir.join("dist").to_string_lossy().to_string());
    possible_paths.push(resources_dir.to_string_lossy().to_string());
    possible_paths.push(contents_dir.join("dist").to_string_lossy().to_string());

    // 添加以下两行，检查 Tauri 资源结构
    possible_paths.push(resources_dir.join("_up_").join("dist").to_string_lossy().to_string());
    possible_paths.push(resources_dir.join("_up_").to_string_lossy().to_string());
}
```

### 步骤 3：隐藏程序坞图标

**文件**：`src-tauri/src/lib.rs`

**修改内容**：在 `run_headless` 函数的 `setup` 函数中添加设置激活策略的代码

```rust
.setup(|app| {
    info!("Headless setup starting...");

    // 添加以下代码，隐藏 macOS 上的程序坞图标
    #[cfg(target_os = "macos")]
    {
        app.set_activation_policy(tauri::ActivationPolicy::Accessory);
        info!("Headless mode: Dock icon hidden on macOS");
    }

    // 初始化日志桥接
    modules::log_bridge::init_log_bridge(app.handle().clone());

    // 其他代码保持不变
    // ...
})
```

### 步骤 4：构建应用

**命令**：

```bash
# 构建前端代码
npm run build

# 构建无头应用
npm run build:headless:mac
```

## 3. 配置说明

### 环境变量

无头应用支持以下环境变量来覆盖默认配置：

| 环境变量              | 描述               | 默认值                                 |
| --------------------- | ------------------ | -------------------------------------- |
| `ABV_BIND_LOCAL_ONLY` | 是否只绑定本地地址 | `false`（绑定 0.0.0.0，允许 LAN 访问） |
| `ABV_API_KEY`         | API Key            | 从配置文件读取                         |
| `ABV_WEB_PASSWORD`    | Web UI 密码        | 与 API Key 相同                        |
| `ABV_DIST_PATH`       | 前端文件路径       | 自动检测                               |

### 访问控制

- 无头模式默认强制使用 `AllExceptHealth` 认证模式，确保 Web UI 安全
- 登录时使用 API Key 或 Web UI 密码

## 4. 注意事项

### 平台差异

- **macOS**：应用包结构为 `Contents/Resources/_up_/dist/`，需要特别处理路径检测
- **Windows**：应用包结构不同，路径检测逻辑可能需要调整
- **Linux**：不同发行版的应用包结构可能不同

### Tauri 版本

- 不同版本的 Tauri 可能有不同的资源打包结构
- 确保测试不同版本的 Tauri 以确保兼容性

### 前端构建

- 确保在构建应用之前，前端代码已经构建完成，生成了 `dist` 目录
- 前端构建命令应该在 Tauri 构建命令之前执行

### 错误处理

- `set_activation_policy` 方法返回的是 `()`（空元组），不是 `Result` 类型，不需要使用 `unwrap_or` 等方法
- 前端文件路径检测应该有合理的错误处理，确保即使找不到前端文件，应用也能启动

## 5. 常见问题

### 问题 1：前端文件找不到

**症状**：应用启动后，浏览器访问 `http://localhost:8045` 返回 404 错误

**解决方案**：

- 检查 `tauri.conf.json` 中的 `resources` 配置是否正确
- 检查 `lib.rs` 中的路径检测逻辑是否包含了正确的路径
- 确保前端代码已经构建完成，生成了 `dist` 目录

### 问题 2：程序坞图标仍然显示

**症状**：应用启动后，在程序坞中显示图标

**解决方案**：

- 确保在 `run_headless` 函数的 `setup` 函数中添加了设置激活策略的代码
- 确保代码在 `setup` 函数的开始处执行，而不是在其他地方

### 问题 3：构建失败

**症状**：执行 `npm run build:headless:mac` 命令时失败

**解决方案**：

- 检查 `tauri.conf.json` 的语法是否正确
- 确保前端代码能够正常构建
- 检查 Rust 代码是否有语法错误

## 6. 后期维护

当 main 分支更新后，要将应用改为无头应用，只需按照上述步骤执行即可。主要需要关注以下文件的变更：

1. `src-tauri/tauri.conf.json` - 确保 `resources` 配置存在
2. `src-tauri/src/lib.rs` - 确保前端文件路径检测逻辑正确
3. 前端构建配置 - 确保 `dist` 目录能够正确生成

## 7. 测试

构建完成后，测试以下内容：

1. 应用启动后，是否只在状态栏显示图标，不在程序坞中显示
2. 浏览器访问 `http://localhost:8045` 是否能够正常显示前端页面
3. 登录是否正常工作
4. 核心功能是否正常运行

## 8. 结论

通过以上步骤，你可以将 Antigravity Tools 从正常应用迁移到无头应用，使其在后台运行并通过浏览器提供服务。这种模式特别适合服务器环境或需要长期运行的场景，能够减少资源占用并提高稳定性。
