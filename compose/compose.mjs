#!/usr/bin/env node
/**
 * 按镜头表合成成片：每镜叠到统一画布，参数一致后 concat。
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values: o } = parseArgs({ options: { film: { type: 'string' }, out: { type: 'string' } } })
if (!o.film || !o.out) {
  console.error('usage: compose.mjs --film film.json --out out.mp4')
  process.exit(2)
}

const base = dirname(resolve(o.film))
const film = JSON.parse(readFileSync(o.film, 'utf8'))
const [W, H] = film.size.split('x').map(Number)
const fps = film.fps
const bg = film.background
const work = o.out.replace(/\.[^.]+$/, '') + '.shots'
mkdirSync(work, { recursive: true })

const parts = []
film.shots.forEach((s, i) => {
  const src = resolve(base, s.source)
  const part = `${work}/${String(i).padStart(2, '0')}_${s.id}.mp4`
  const dur = Number(s.duration)
  const out = []
  if (s.mode === 'pad') {
    // 已经是成品画面：等比缩放后补边到画布，不叠背景
    out.push('-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0a0d16,fps=${fps},setsar=1`)
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-t', String(dur), ...out, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', part], { stdio: 'inherit' })
  } else {
    // 透明素材：叠到背景上，scale/at 由镜头表给
    const scale = s.scale ?? 1
    const [x, y] = s.at ?? [0, 0]
    const chain = scale === 1 ? '[fg]null[scaled]' : `[1:v]scale=iw*${scale}:ih*${scale}[scaled]`
    execFileSync('ffmpeg', [
      '-y', '-v', 'error',
      '-f', 'lavfi', '-i', `${bg}:r=${fps}:d=${dur}`,
      '-i', src,
      '-filter_complex', `${chain};[0][scaled]overlay=${x}:${y}:format=auto[v]`,
      '-map', '[v]', '-t', String(dur), '-r', String(fps),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', part,
    ], { stdio: 'inherit' })
  }
  parts.push(part)
})

const list = `${work}/concat.txt`
writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'))
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', o.out], { stdio: 'inherit' })
console.log(`ok ${o.out}  ${film.shots.length} shots  ${W}x${H}@${fps}`)