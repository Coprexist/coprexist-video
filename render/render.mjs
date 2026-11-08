#!/usr/bin/env node
/**
 * 把暴露 window.setFrame(t) / window.renderAt(t) 的页面渲染成视频。
 * 时间接口是契约：同一 t 必须永远产出同一帧。
 */
import { chromium } from 'playwright-core'
import { mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const { values: o } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string' },
    duration: { type: 'string', default: '5' },
    fps: { type: 'string', default: '30' },
    size: { type: 'string', default: '1920x1080' },
    audio: { type: 'string' },
    transparent: { type: 'boolean', default: false },
    chrome: { type: 'string', default: process.env.CHROME_PATH || '/opt/google/chrome/chrome' },
    'keep-frames': { type: 'boolean', default: false },
  },
})

if (!o.url || !o.out) {
  console.error('usage: render.mjs --url <url> --out <file> [--duration 5] [--fps 30] [--size 1920x1080] [--audio file] [--transparent] [--keep-frames]')
  process.exit(2)
}

const [W, H] = o.size.split('x').map(Number)
const fps = Number(o.fps)
const duration = Number(o.duration)
if (!(W > 0 && H > 0) || !(fps > 0) || !(duration > 0)) {
  console.error('size / fps / duration 必须是正数')
  process.exit(2)
}

const framesDir = o.out.replace(/\.[^.]+$/, '') + '.frames'
rmSync(framesDir, { recursive: true, force: true })
mkdirSync(framesDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: o.chrome,
  args: [
    '--no-sandbox', '--disable-gpu', '--force-color-profile=srgb',
    '--allow-file-access-from-files',
    ...(o.transparent ? ['--default-background-color=00000000'] : []),
  ],
})
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.goto(o.url, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

const api = await page.evaluate(() =>
  typeof window.setFrame === 'function' ? 'setFrame'
  : typeof window.renderAt === 'function' ? 'renderAt' : null)
if (!api) {
  await browser.close()
  console.error('页面没有暴露 window.setFrame(t) 或 window.renderAt(t)')
  process.exit(3)
}

const total = Math.round(fps * duration)
for (let i = 0; i < total; i++) {
  await page.evaluate(([fn, t]) => window[fn](t), [api, i / fps])
  await page.screenshot({
    path: `${framesDir}/${String(i).padStart(4, '0')}.png`,
    omitBackground: o.transparent,
  })
}
await browser.close()

const enc = o.transparent
  ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-qscale:v', '20']
  : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18']
const args = ['-y', '-v', 'error', '-framerate', String(fps), '-i', `${framesDir}/%04d.png`]
if (o.audio) args.push('-i', o.audio)
args.push(...enc, '-r', String(fps))
if (o.audio) args.push('-c:a', 'aac', '-shortest')
args.push(o.out)
execFileSync('ffmpeg', args, { stdio: 'inherit' })

if (!o['keep-frames']) rmSync(framesDir, { recursive: true, force: true })
console.log(`ok ${o.out}  ${total} frames @ ${fps}fps  ${W}x${H}${o.transparent ? '  alpha' : ''}`)