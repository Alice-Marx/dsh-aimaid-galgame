# DeepSeek Harness 独立 GAL 插件

GAL 已从模型路由插件中拆出，可单独安装、更新和扩展。当前只提供 **《回声之城·正篇》** 与 **《旧城迁移篇：未写完的约定》**；不需要先安装模型路由插件。

[安装与版本](INSTALLATION_GUIDE.zh.md) · [存档迁移](MIGRATION.md) · [剧情攻略](docs/ECHO_CITY_STORY.zh.md) · [完整设置说明](docs/GAL_SETTINGS.zh.md) · [立绘来源](docs/GAL_ART_SOURCES.zh.md)

![官方 rc.2 独立 GAL 0.1.0](https://raw.githubusercontent.com/Alice-Marx/deepseek-harness-galgame/main/docs/assets/standalone-gal-0.1.0.png)

*本轮官方 rc.2 隔离 profile 实拍：只安装 GAL，没有模型路由；剧情离线运行。*

## 一、安装

适配官方 **DeepSeek Harness Desktop 0.2.0-rc.1 / 0.2.0-rc.2**。打开 **插件 → 添加插件**，输入完整包名：

```text
@ljwei-stak/dsh-galgame@0.1.0
```

安装后启用插件，侧边栏会出现 **Gal 模块**。若镜像尚未同步新包，安装源改为 `https://registry.npmjs.org`。若已安装但入口未刷新，重载客户端或重启桌面。`next` 标签用于桌面预发布渠道，指定上面的版本可获得固定安装结果。

本仓库地址也可填入插件安装框：

```text
https://github.com/Alice-Marx/deepseek-harness-galgame
```

## 二、剧情模式怎么用

1. 打开 **Gal 模块 → 标题画面**，在剧目列表选择一部作品。
2. **开始新故事**会替换该作品的自动进度，界面会先确认已有存档；手动存档槽与快捷存档仍保留。**继续阅读**恢复该作品的进度。
3. 对话出现后点击继续；未显示完的文字先完整显示。遇到选项或命名输入，请主动选择或输入。自动播放与跳过不会代选分支。
4. 阅读工具栏可切换章节、查看历史、好感度、存读 1–3、快捷存读、导出/导入 JSON。正篇的隐藏章节显示锁定条件。
5. 正篇从序章顺序推进，保留本周目的关键旗标、路线完成状态与 14 位角色的好感度。共通八章后进入角色线；隐藏线有剧情前提，TRUE END 还需要完成六条角色线和隐藏线。详见[剧情说明](docs/ECHO_CITY_STORY.zh.md)。

剧情引擎和存档在本机运行，**剧情模式不需要账号，也不调用模型**。每部作品的自动进度、手动槽与快捷存档分开存储，避免跨作品覆盖。

![标题画面](https://raw.githubusercontent.com/Alice-Marx/deepseek-harness-galgame/main/docs/assets/gal-title-0.11.0-preview.jpg)

*上图来自旧合并版 0.11.0，用于展示保留的界面结构；独立版只列出两部精选作品。*

## 三、人物大小、位置与音乐

打开 **Gal 设置**：

- **立绘**：全身原图/表情近景；全局大小和位置；按角色调整缩放、横向与纵向位置；双人舞台间距。
- **阅读**：字体大小、打字速度、自动推进间隔、已读跳过、对话框透明度、减少动画。
- **音乐**：开启/暂停、静音、背景音乐与音效音量、曲目选择、本地音频文件；切到后台时可以暂停。
- **存档**：三槽、快捷存档与 JSON 导入导出在剧情工具栏使用；清理桌面数据前请先导出。

![系统设置](https://raw.githubusercontent.com/Alice-Marx/deepseek-harness-galgame/main/docs/assets/gal-settings-0.11.0-preview.jpg)

*旧合并版 0.11.0 的设置截图。人物原图、表情近景与音频设置在独立版继续使用。*

MiMo 使用自己的 `mimo/Mimo.png`，Mistral 使用 `Mistral/Mistral.png`，Claude 使用你指定的 `Claude/Claude.png`。全身模式保留完整原图，不会换成半身表情板；近景模式再按情绪显示差分。源图哈希与尺寸见[来源清单](docs/assets/gal-portrait-sources.json)。

## 四、自由模式怎么用

1. 先在 Harness 的官方模型设置中配置对应供应商和模型。
2. 打开 **自由模式**，选供应商/模型路线、角色和场景。
3. 输入你想说的话并发送。界面通过官方 LLM 服务获取回应，可取消正在运行的一轮。
4. 也可复制开场提示词到官方会话使用。

自由模式只显示官方目录中的可路由模型。目录登记不保证账号和网络现在可用；真实调用使用你配置的官方凭据，插件不读取或保存 API Key。每轮请求超时 120 秒，请求最多输出 1,500 token。打开 **插件 → GAL 插件详情 → 设置**，可调整 **自由模式最大回复字符数**，范围 500–8000，默认 8000；点保存设置后生效。它只限制单轮返回文本，不限制服务商收费。此模式按所选模型正常计费。

## 五、从旧插件升级

将原来的 `@ljwei-stak/model-router-galgame` 更新到模型路由独立版 **0.12.0**，再安装 GAL **0.1.0**。如不需要模型路由，也可以停用旧合并版并只安装 GAL。不要同时启用旧合并版与独立 GAL，以免出现重复入口。

独立版保留旧的 `model-router:gal` 存储键。桌面使用相同 profile 和浏览器 origin 时，可继续读取旧进度及设置；若桌面变更 origin/profile，请用旧版导出的 JSON 导入。具体操作见[迁移说明](MIGRATION.md)。

其他篇目的原稿和专属美术保存在单独源码档案中，不在此 npm 包内。本仓库保留两部作品的完整源码和美术，方便继续扩写正篇。

## 开发与验证

```powershell
pnpm install --frozen-lockfile
npm test
npm run build:client
npm run check:client
pnpm peers check
npm run pack:local
```

`node tools/preview-gal.mjs` 提供实际组件的离线浏览器预览。官方模型的真实账号登录与付费调用需要使用者自己的账号完成验证。
