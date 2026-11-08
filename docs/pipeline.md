# 管线

## 三层

```
页面（HTML / React / Manim 输出）
   ↓  render/render.mjs —— 逐帧调用 window.setFrame(t) 并截图
镜头（统一规格的 mp4 / mov）
   ↓  compose/compose.mjs —— 叠背景、定位、串联
成片（1920x1080 @ fps）
```

## 契约：时间接口

页面暴露 `window.setFrame(t)`（或 `window.renderAt(t)` 作别名），t 是秒，范围 `[0, duration)`。

要求：**同一 t 永远产出同一帧**。

- ✅ 允许：由 t 直接算出的 transform / opacity / 帧号
- ❌ 禁止：`Date.now()`、`Math.random()`、依赖上一帧累积的状态、CSS `animation` 自行播放

之所以强制：渲染器会重跑同一段，两次结果必须逐像素一致，否则缓存失效、拼接错位、
和真录屏对不上。

## 三种页面来源

### 1. 单文件 HTML

`file://` 直接打开即可，不需要起服务。适合片头、转场、版式类镜头。

### 2. React 组件（真界面）

需要 Vite 编译，因为要 import 项目源码：

```bash
# 在项目 frontend 里加一个独立入口（不要碰业务路由）
node node_modules/vite/bin/vite.js --port 5174
node render/render.mjs --url http://127.0.0.1:5174/video.html --out out/modal.mov --duration 2.4 --transparent
```

注意：`pnpm dev` 会触发自动 install，可能改动 node_modules。直接调 vite 二进制更稳。

### 3. Manim

Manim 只出内容，容器交给 HTML。所以要先透明渲染，再转 PNG 序列给页面按帧切：

```bash
manim -t -qh --fps 30 scenes/manim/queue.py QueueFlow
ffmpeg -i media/videos/queue/1080p30/QueueFlow.mov -vf fps=30 scenes/html/frames/%04d.png
```

页面里用 `<img>` 换 src，不用 `<video>`——`currentTime` 的 seek 精度在 60fps 下会截在两帧之间。

## 镜头表

`film/example.json` 描述每个镜头的来源、缩放、位置、时长：

```json
{
  "size": "1920x1080",
  "fps": 60,
  "background": "gradients=s=1920x1080:c0=0x0a0d16:c1=0x161d33",
  "shots": [
    { "id": "bubble", "source": "out/bubble.mov", "scale": 1.3, "at": [860, 590], "duration": 2.6 },
    { "id": "queue", "source": "out/queue.mp4", "mode": "pad", "duration": 8.0 }
  ]
}
```

- `mode: overlay`（默认）：透明素材叠在背景上，`scale` 与 `at` 生效
- `mode: pad`：已经是成品画面的镜头，等比缩放后补边到画布

## 已实测（2026-11）

| 项 | 数据 |
|---|---|
| Manim 透明渲染 | 1080p30，8.03s，241 帧，4.8MB mov |
| 真组件截图 | 960×600 viewport，144 帧，ProRes 4444 11MB |
| 合成 | 1920×1080 60fps，8.7s，concat 无损 |
| 单镜渲染耗时 | 270 帧约 40 秒（系统 Chrome，无 GPU） |

## 踩过的坑

1. `pnpm dev` 自动 install，改用 `node node_modules/vite/bin/vite.js`
2. 项目主题靠 `.dark` 类，独立入口要自己加 `<html class="dark">`
3. `.btn` 不带尺寸，规范是 `.btn .btn-md`
4. Manim 的 `Mobject + Vector` 不成立，用 `.shift()`
5. 透明素材边缘抗锯齿：容器背景比内容背景深一档，或在 Manim 里自画背景矩形