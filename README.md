# DeepSeek Harness GAL · 回声之城

An independently installable visual novel plugin for the official **DeepSeek Harness Desktop 0.2.0-rc.1 / 0.2.0-rc.2**. The model router is optional and has its own releases.

[中文使用说明](README.zh.md) · [安装与版本](INSTALLATION_GUIDE.zh.md) · [迁移存档](MIGRATION.md) · [剧情攻略](docs/ECHO_CITY_STORY.zh.md) · [立绘与音乐设置](docs/GAL_SETTINGS.zh.md)

![Standalone GAL 0.1.0 in the official rc.2 runtime](https://raw.githubusercontent.com/Alice-Marx/deepseek-harness-galgame/main/docs/assets/standalone-gal-0.1.0.png)

*Actual isolated rc.2 profile with only the GAL plugin installed. No model account was called.*

## Install

In DeepSeek Harness, open **Plugins → Add plugin**, then enter:

```text
@ljwei-stak/dsh-galgame@0.1.0
```

Choose the official npm registry `https://registry.npmjs.org` if your mirror has not synchronized the new package. Enable the installed plugin; **Gal 模块** appears in the sidebar. Reload the desktop if its client has not refreshed. The `next` tag points to the desktop prerelease channel; the exact version above is reproducible.

You can instead enter this repository URL, or the absolute path to a built local checkout. See the [installation guide](INSTALLATION_GUIDE.zh.md) for each method. The plugin adds no separate desktop installer.

## Two bundled stories

| Story | Contents |
| --- | --- |
| **回声之城·正篇** | Eight common chapters, six character routes, the hidden 「影与身」 route, naming night and TRUE END. Choices retain flags and affinity across chapters. |
| **旧城迁移篇：未写完的约定** | The original Old City Migration story and its existing save format. |

Other stories are preserved in the separate source archive and are excluded from this package. Story mode runs offline without a model account.

## Play and configure

1. Open **Gal 模块**, select a story on the title screen, then choose **开始新故事** or **继续阅读**.
2. Advance dialogue with the continue control; choose branches explicitly. Auto and skip stop at choices, names and endings.
3. Use the three manual slots, quick save, history, chapter selection and affinity panel while reading. Export a JSON save before changing profiles or clearing desktop data.
4. Open **Gal 设置** to select full body or close-up portraits, change global and per-character scale/position, tune text speed/font/dialogue opacity, adjust audio or load local music. The music file itself stays local and is not stored in the JSON save.
5. **素材鉴赏** previews backgrounds and characters. Full body mode uses original artwork; expression close-ups are a separate setting.

![Title menu, captured in the previous combined plugin](https://raw.githubusercontent.com/Alice-Marx/deepseek-harness-galgame/main/docs/assets/gal-title-0.11.0-preview.jpg)

*Historical screenshot from combined plugin 0.11.0. This release keeps the GAL interface and ships only the two stories listed above.*

![Portrait, reading and music settings](https://raw.githubusercontent.com/Alice-Marx/deepseek-harness-galgame/main/docs/assets/gal-settings-0.11.0-preview.jpg)

*Historical combined plugin 0.11.0 settings screenshot.*

## Free dialogue

Configure a provider and model in the official Harness model settings. In **自由模式**, choose that exact route, a character and a scene, then send a message. Replies go through the official Harness LLM service. The plugin neither asks for nor stores API keys. Its model catalog is the official configured catalog; a listed model still needs valid credentials and network access.

Each turn has cancellation, a 120-second timeout and a 1,500-token output request. **Plugins → GAL details → Settings → 自由模式最大回复字符数** adjusts the displayed reply cap from 500 to 8,000 characters (default 8,000). This cap does not limit provider charges. The dialogue request retains at most 24 bounded messages. Copying the generated opening prompt into an official conversation remains available. Free dialogue may incur the selected provider's normal charges; offline story mode does not call a model.

## Upgrade from the combined plugin

Update `@ljwei-stak/model-router-galgame` to router-only **0.12.0**, then install this package separately. Keeping an older combined plugin enabled alongside GAL may register the same GAL panel twice, so update or disable the older plugin first.

Existing `model-router:gal` storage keys are preserved. If the desktop keeps the same browser origin/profile, existing progress and preferences can resume. If it changes storage origin or profile, import an exported save instead. See [migration details](MIGRATION.md).

## Development

The repository includes client source, both story engines, source portraits, backgrounds, expression artwork, tests and the committed generated client. npm contains only installable runtime and concise installation docs, with art embedded in the client bundle.

```sh
pnpm install --frozen-lockfile
npm test
npm run build:client
npm run check:client
pnpm peers check
npm run pack:local
```

For a local browser preview of the actual GAL component:

```sh
node tools/preview-gal.mjs
```

The preview is offline and does not authenticate models. The official Harness still owns model credentials and model availability. Artwork provenance is recorded in [the source inventory](docs/assets/gal-portrait-sources.json); MiMo, Mistral and the user-selected Claude originals retain their separate verified mappings.

License: [MIT](LICENSE).
