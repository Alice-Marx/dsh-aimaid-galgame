# 独立 GAL 插件安装与版本

## 版本选择

| 功能 | 安装包 | 适配桌面 |
| --- | --- | --- |
| 独立 GAL | `@ljwei-stak/dsh-galgame@0.1.0` | DeepSeek Harness Desktop 0.2.0-rc.1 / 0.2.0-rc.2 |
| 独立模型路由，可选 | `@ljwei-stak/model-router-galgame@0.12.0` | DeepSeek Harness Desktop 0.2.0-rc.1 / 0.2.0-rc.2 |

两个包可同时启用，更新互不依赖。路由包保留旧 npm 名称以便原用户升级；0.12.0 起已不含 GAL 资源。

## npm 安装（推荐）

1. 在官方桌面打开 **插件 → 添加插件**。
2. 输入 `@ljwei-stak/dsh-galgame@0.1.0`。
3. 选择安装源并点 **安装**。新包如尚未进入国内镜像，使用自定义源 `https://registry.npmjs.org`。
4. 启用插件，打开侧边栏 **Gal 模块**。入口未刷新时重载客户端或重启桌面。

发布渠道 `next` 用于预发布版桌面适配，可填写 `@ljwei-stak/dsh-galgame@next`；指定 0.1.0 可以确保安装固定版本。若宿主提示版本不兼容，请核对桌面版本，不要强制修改 peerDependencies 绕过检查。

## GitHub 安装

添加插件框填入：

```text
https://github.com/Alice-Marx/deepseek-harness-galgame
```

仓库包含提交的 `client.js` 与宿主入口，可由官方插件管理器加载。发布页提供版本说明和 npm tarball：

<https://github.com/Alice-Marx/deepseek-harness-galgame/releases>

## 本地源码目录安装

```powershell
git clone https://github.com/Alice-Marx/deepseek-harness-galgame.git
cd deepseek-harness-galgame
pnpm install --frozen-lockfile
npm run build:client
```

在添加插件框填源码目录的绝对路径，例如 `F:\everyAI\all\deepseek-harness-galgame`。本地路径必须是包含 package.json 的插件目录；无需把仓库移到 C 盘。

## 升级旧合并插件

旧合并版同时注册模型路由与 Gal 入口。先导出重要存档，再更新到路由独立版 0.12.0 或停用旧合并版，最后安装独立 GAL。详细步骤见 [MIGRATION.md](MIGRATION.md)。

剧情模式离线可玩。自由模式需要官方模型设置内已有有效模型账号，插件不管理账号凭据。

## 自由模式回复长度

在 **插件 → GAL 插件详情 → 设置** 中调整 **自由模式最大回复字符数**（500–8000，默认 8000），保存后用于下一轮回复。此设置只限制返回文本，不限制模型账号收费。立绘、音乐与阅读设置在 **Gal 模块 → Gal 设置** 中调整。
