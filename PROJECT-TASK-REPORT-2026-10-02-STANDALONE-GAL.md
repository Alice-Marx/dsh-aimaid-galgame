# 总项目任务报告：独立 GAL 0.1.0

日期：2026-10-02。本项目从原 Model Router Galgame 分离，用户可单独安装 GAL；无需安装模型路由。模型路由在原仓库独立更新为 0.12.0。

## 已完成工作

1. 建立独立包 `@ljwei-stak/dsh-galgame@0.1.0` 和 GitHub 仓库 `Alice-Marx/deepseek-harness-galgame`。独立 Host `dsh-galgame`、Typert 服务 `dshGalgame`、客户端模块与版本。
2. 仅内置《回声之城·正篇》和《旧城迁移篇：未写完的约定》。保留共通八章、角色线、隐藏线、命名及 TRUE END；保留播放器、人物布局/全身原画、音乐、阅读、历史、存档、JSON 导入/导出和自由模式。
3. 自由模式读取官方模型目录，使用官方 LLM 服务对话；请求验证、随机 ID、取消、超时、输出截断沿用原实现。新配置“自由模式最大回复字符数”范围 500–8000，默认 8000，是显示上限，不是收费上限。
4. 保留历史 `model-router:gal` localStorage 键和 save format。同 origin/profile 可沿用；跨 origin/profile 使用 JSON 备份。原版包名保留在路由项目用于直接升级。
5. MiMo/Mistral 使用不同的正确原稿；Claude 使用用户指定原稿。保留 29 个注册角色、共享背景、正篇场景、72 个表情差分，以及可重制的原稿/原始表情板和脚本。
6. 抽出 `gal-catalog.mjs` 与 `gal-workspace.css`，彻底移除路由算法和官方 CLI 工具代码。构建依赖图禁止重新引入路由。
7. 首轮真实官方 rc.2 安装发现空 Config 不提供客户端配置 namespace，故入口不显示；改为有实际 volatile 字段并提供设置表单。重新安装确认入口出现。测试本地同路径、同版本 tarball 时，pnpm 会缓存旧源码；改用哈希命名的测试副本并核对安装文件，避免旧缓存造成误判。对公开发布使用不可变新版本，不修改宿主。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `.dsh-plugin/index.mjs` / `cordis.patch.yml` | 独立 Host 注册和配置。 |
| `.dsh-plugin/gal-remote-service.mjs` / `shared/gal-remote.mjs` | 官方 LLM 对话及专属 typed RPC。 |
| `client/official-harness.jsx` | GAL 侧栏、主页面、插件详情与独立设置。 |
| `client/gal-module-page.jsx` | 标题、剧情、自由模式、阅读和玩家操作。 |
| `shared/gal-story*.mjs` | 两部内置作品与剧情状态机；不包含归档剧目。 |
| `client/gal-story-storage.mjs` / `gal-save-transfer.mjs` | 兼容存档、三槽、快捷与 JSON 备份。 |
| `client/gal-preferences.mjs` / `gal-settings-panel.jsx` | 人物、声音、文字和阅读偏好。 |
| `aipicture` / `client/echo-*` / `output` | 原画、实际加载素材与制作源；不把制作原图再次放入 npm。 |
| `scripts/build-client.mjs` / `prepack.mjs` | 内嵌素材客户端与发布前生成检查。 |
| `scripts/check-split-desktop.mjs` / `verify-release.mjs` | 官方隔离安装组合与 npm/Git 字节校验。 |
| `tests/standalone-plugin.test.mjs` / `desktop-compat.test.mjs` | 独立服务、输出/取消、目录、Config、官方 gate 和未验证版本拒绝。 |
| README、安装指南、MIGRATION、`docs/GAL_*` | 安装、迁移、玩法、设置和美术来源图文说明。 |

其他剧目仍保存在 `F:\everyAI\all\model-router-galgame-optional-stories`，旧未使用的适配/制作源码保存在 `F:\everyAI\all\model-router-galgame-legacy-source`；原仓库 Git 历史保留。它们未进入本包，不是已发布扩展插件。

## 已执行验证

- `npm test`：最终 100/100 通过，包括两个官方版本 gate、两剧目目录、剧情/设置/存档/音频/全身资源、实际 Cordis mount/unload 和模拟模型流。
- 路由 70/70 + GAL 100/100，两个核心项目共 **170/170**；可选剧目源码归档另外 11/11 通过，不计入核心测试数量。
- `pnpm install --frozen-lockfile`、`pnpm peers check`、构建与生成客户端检查通过。客户端 53,814,555 字节。
- 用已安装官方 Desktop 所带 rc.2 CLI，在 F 盘隔离 home 分别安装“仅路由”“仅 GAL”“两者一起”。三组合入口、路由规划或 GAL 两部剧目/场景、存档保存与重载、设置预览均通过，客户端 runtime error 为 0。只装 GAL 时没有路由入口，单装路由时没有 GAL 入口。
- 本轮截图 `docs/assets/standalone-gal-0.1.0.png` / `standalone-settings-0.1.0.png` 来自仅 GAL 的官方隔离 profile。旧 0.11.0 截图有明确历史标注。
- 未使用真实用户模型账号，没有启动付费调用；自由模式真实账号和费用需要用户验收。

## 用户需要执行的测试

1. 升级前从旧合并版导出两部作品进度并备份 profile，再将旧合并版升级到路由 0.12.0 或停用，最后安装独立 GAL，避免重复入口。
2. 同 profile 核对旧进度、手动槽、人物布局和音量；不同 profile/origin 选择对应剧目再导入 JSON。JSON 不包含所有槽位、偏好或本地音频文件。
3. 继续章节与角色线，检查命名及结局；使用本人模型凭据测试自由模式回复、取消及新字符上限。

## 统一迁移顺序

**导出进度并备份 profile → 升级或停用旧合并版 → 安装独立 GAL。** 相同浏览器 origin/profile 复用历史存储键；更换 origin/profile 或未读到进度时，在对应剧目导入 JSON。JSON 仅是当前剧情状态，不包含全部槽位、设置、已读记录、本地音频和自由模式对话。

已发布路由 0.12.0 包内指南先装 GAL 再升级路由，完成两步后的结果兼容，但中间可能短暂出现同 GAL 面板的重复入口。本项目指南与本报告采用先升级/停用旧合并版的顺序；不修改已经发布的路由包。

模型路由的完整操作教程不在其 npm 包内，可在线阅读 [GitHub 工作台使用指南](https://github.com/Alice-Marx/model-router-galgame/blob/main/docs/WORKBENCH_USER_GUIDE.zh.md)。

## 未完成与后续方式

- 正篇新篇幅和独立全身表情/CG：在本仓库扩充章节、更新剧情/存档回归、按原稿生成美术后单独发布 GAL 新版。
- 真实模型与收费：固定任务/对话样例记录回复、耗时和账单，由账号持有人完成。
- 后续官方宿主版本：审计 API、扩展兼容矩阵、隔离实装通过后新增 peer 支持范围。
- 可选剧目扩展：先设计显式剧情数据包协议，再从独立归档恢复；不重新扩大当前主包。

## 发布记录

- GAL 正式候选 tarball：**40,188,069 字节**；SHA-256 `B8E4DB966991A772C23A14F02E3EAB08B008DD7941651A98809A3283038DFDE9`。包内 **16 个文件**已与源码提交 `2aef3e4` 校验一致。
- GAL npm **发布成功**，`latest` 与 `next` 均指向 `0.1.0`。从官方 registry 重新取得的 tarball 为 **40,188,069 字节**，SHA-1 `e727febcbe79f13e009da23bb3455cdbe285e012`、SHA-512 `sha512-F8LxaRgACypypl97gEyBlOfQOIm5GqLnxurFpIIjb4I4fWoe+MzOqkPZcleFfTW5O+avXvMjqH5F/E3IvCZZ5A==`，与候选包一致；16 个发布文件逐一与推送后的 GitHub `origin/main` 一致。
- 配套路由 `@ljwei-stak/model-router-galgame@0.12.0` **已成功发布 npm `next`**。tarball **333,507 字节**，SHA-256 `C3B2F354374B355DF1751DC64229BEEE2C09053B8CD7F9443BCA9FD36BAE0A06`；从 npm 下载的 **29 个文件**已与提交 `a15907f` 校验一致。
- 新 GAL GitHub 仓库：[Alice-Marx/deepseek-harness-galgame](https://github.com/Alice-Marx/deepseek-harness-galgame)，[公开 v0.1.0 Release](https://github.com/Alice-Marx/deepseek-harness-galgame/releases/tag/v0.1.0) 已上传安装包与 `.sha256`。从 Release 下载的 **40,188,069 字节** tarball 的 SHA-256 与校验附件相同；16 个文件逐一同 `origin/main` 一致，`v0.1.0` 标签指向发布提交 `2aef3e42b8d266f7a45222d3010751771e3fbd90`。
- 路由 GitHub Release：[v0.12.0](https://github.com/Alice-Marx/model-router-galgame/releases/tag/v0.12.0)，是公开预发布，已上传并验证 tarball 和校验文件。远端标签与已验提交一致。
