# AGENTS.md — LBoL 图鉴

东方光耀夜（Lost Branch of Legend）网页图鉴。仅供个人学习、非商业使用。

## 命令

```bash
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python pipeline/build.py              # 全量：数据 + 图片（首次编码图片较慢）
.venv/Scripts/python pipeline/build.py --no-images  # 只重建数据
.venv/Scripts/python pipeline/richtext.py           # 文本解析自检
pnpm install && pnpm dev                            # http://localhost:3000
pnpm test && pnpm build                             # 筛选逻辑自检、生产构建
```

游戏路径默认 `D:\SteamLibrary\steamapps\common\LBoL`，可用 `LBOL_GAME_DIR` 覆盖。

## 数据流

```
resources.assets → ConfigData/*Config (TextAsset, 自定义二进制)  → pipeline/tables.py
StreamingAssets/Localization/<lang>/*.yaml                      → pipeline/build.py + richtext.py
aa/StandaloneWindows64/*.bundle, resources.assets 精灵图        → pipeline/assets.py → public/img/
                                                                → public/data/lbol.<lang>.json
```

- `tables.py`：字段顺序照抄 `LBoL.ConfigData.dll` 各 `Load()`。读完有剩余字节会报错，这就是游戏更新改了结构的信号；用 `ilspycmd`（需 `DOTNET_ROLL_FORWARD=Major`）反编译核对。
- `richtext.py`：把 `{占位符}`、`|术语|`、`<sprite>` 转成 token 数组，格式见文件头。前端不用 `v-html`。
- `random_pools.py`：会生成有限范围随机牌的卡牌，逐张抄自 `RollCards` 调用，游戏更新后要复查。前端的 `inRoll`（`collections.js`）据此筛选。
- `card_values.py`：写在 C# 里的静态数值，游戏更新后要复查。查不到的值显示为 X，列在 `reports/build_report.md`。
- `build.py` 中 `EXCLUDED_CHARACTERS`：制作中的角色（目前是爱丽丝）及其专属卡牌、展品不进入图鉴。
- 描述文本、图片键、图鉴可见性都照 `Card.GetBaseDescription`、`CardWidget.RefreshCardImage`、`MuseumPanel` 实现。

## 前端约定

- `src/config/collections.js`：每个标签页的筛选项和排序，纯函数，由 `collections.test.js` 用 node 测试。颜色筛选必须与 `MuseumPanel.FilterCardByMana` 一致。
- `src/store/codex.js`：共享状态（模块级 ref，不用 Pinia），含 hash 路由 `#/<tab>/<id>?<筛选>`。筛选和 URL 的互转是 `collections.js` 的 `encodeState` / `decodeState`：带筛选参数的链接会覆盖当前筛选，不带的保留。
- `src/components/`：`layout/` 页面骨架，`filters/` 筛选控件，`entities/` 卡牌、展品的 Tile 和 Detail（在 `registry.js` 注册）和独立的角色页 `CharacterView`，`shared/` 通用组件。
- 新增标签页：`collections.js` 加配置 → `registry.js` 注册组件 → `locales/` 加 `tab.<key>`。
- 卡牌显示照 `CardWidget`：卡框是 `Sprite/Card/Bg/` 贴图拉伸到 530×740，卡图一律拉伸到 454×313（`object-fit: fill`，贴图本身的比例不代表显示比例）。
- 可用卡池照 `GameRunController` 的抽卡逻辑和 `ManaGroup.CanAfford`，见 `collections.js` 的 `inCardPool`。
- 展品有两种分类，不要混用：**稀有度** `rarity`（`ExhibitConfig.Rarity`：普通、罕见、稀有、光耀、秘宝）和**展品类型** `exhibitType`（`Index / 100`，文案取 `Museum.ExhibitType.T1`–`T8`：在前五类之外还有商店、事件&其它、最终幕）。
- 样式：颜色只用 `theme.css` 的变量，组件内用 scoped 样式。

## 本地化

- 所有界面文字走 `t('key')`，定义在 `locales/<code>.json`，**组件里不要硬编码文字**。缺失的键回退到简体中文。
- 游戏术语（卡名、稀有度、类型等）直接取游戏 YAML，不进 `locales/`。
- 新增语言：在 `build.py` 的 `LANGS` 加上（代码同游戏 `Localization/` 目录名），创建 `locales/<code>.json`，重跑 `build.py`。语言切换器在有两种语言时自动出现。
