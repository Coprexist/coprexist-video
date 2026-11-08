import { chromium } from 'playwright-core'
import { mkdirSync, rmSync } from 'node:fs'
const [URL, OUT, W, H, DUR] = [process.argv[2], process.argv[3], Number(process.argv[4]), Number(process.argv[5]), Number(process.argv[6])]
const FPS = Number(process.argv[7] || 30)
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/google/chrome/chrome',
  args: ['--no-sandbox','--disable-gpu','--force-color-profile=srgb','--allow-file-access-from-files']
})
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const N = Math.round(FPS * DUR)
for (let i = 0; i < N; i++) {
  await page.evaluate(t => (window).setFrame(t), i / FPS)
  await page.screenshot({ path: OUT + '/' + String(i).padStart(4,'0') + '.png' })
}
await browser.close()
console.log('frames', N, W + 'x' + H)