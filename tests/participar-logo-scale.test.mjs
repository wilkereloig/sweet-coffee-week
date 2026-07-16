import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

test('public mobile headers use a three-times logo with matching safe space', () => {
  assert.match(styles, /\.brand\s+img\s*\{\s*height:\s*clamp\(120px,\s*33vw,\s*156px\)/s)
  assert.match(styles, /body:not\(\.route-painel\)\s*\{\s*--header-safe-offset:\s*clamp\(156px,\s*33vw,\s*190px\)/s)
})
