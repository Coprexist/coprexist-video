# coprexist-video

Copree 的宣传片 / 科普片 / 教学片生产管线。

它不剪辑，也不播放；它把一段内容拆成若干可复现的镜头，分别渲染，再合成成片。

## 三条渲染路径

| 内容 | 用什么 | 产物 |
|---|---|---|
| 产品真实界面 | React 组件（走 Vite） | 透明 ProRes 4444 |
| 概念 / 数据 / 流程 | Manim | 透明 ProRes 4444 → PNG 序列 |
| 片头 / 转场 / 版式 | 单文件 HTML | mp4 |

三条路径最终都落到同一个契约上，见下文。

## 契约

页面必须暴露一个时间接口：

```js
window.setFrame = (t) => { /* 纯函数：同一 t 永远产出同一帧 */ }
window.renderAt = window.setFrame  // 兼容社区渲染器
```

**确定性是硬要求。** 渲染器逐帧调用它再截图，所以任何依赖真实时钟、随机数、
或上一帧状态的写法，都会让重渲结果漂移。动画状态必须能由 t 唯一决定。

## 快速开始

```bash
pnpm install

# 单文件 HTML 镜头（本地文件即可，不必起服务）
node render/render.mjs \
  --url file://$PWD/scenes/html/panel.html \
  --out out/panel.mp4 --duration 9 --fps 30 --size 1920x1080

# 透明素材（给合成用）
node render/render.mjs --url file://$PWD/scenes/html/panel.html \
  --out out/panel.mov --duration 9 --fps 30 --transparent

# 按镜头表合成整片
node compose/compose.mjs --film film/example.json --out out/film.mp4
```

## 目录

```
render/render.mjs     页面 → 视频。唯一的时间接口契约在这里执行
compose/compose.mjs   镜头表 → 成片。每镜按 scale/at 叠到统一画布再 concat
scenes/html/          单文件 HTML 镜头
scenes/manim/         Manim 场景（透明输出后转 PNG 序列）
film/                 镜头表（JSON）
docs/                 管线说明与踩坑记录
```

## 渲染器约定

- 用系统 Chrome（`CHROME_PATH`），不下载 Playwright 自带浏览器
- `--transparent` 输出 ProRes 4444；不透明输出 H.264
- 帧序列默认保留在 `out/<name>.frames/`，`--keep-frames` 控制是否保留
- 音频：`--audio bgm.mp3`，直接混流，不重编码视频

## 已知取舍

- **不用 `<video>` 驱动 Manim 段**：`currentTime` 的 seek 精度在 60fps 下不可靠，
  同一帧可能截在两帧之间，重渲结果会漂。改走 PNG 序列，帧号即帧。
- **不内置剪辑**：粗剪用 `compose`，精剪交给剪映 / 达芬奇。
  改配乐不该触发整片重渲，这是刻意保留的人工环节。

## 许可

MIT