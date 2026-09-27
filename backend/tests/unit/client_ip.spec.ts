import { test } from '@japa/runner'
import { resolveClientIp } from '#services/client_ip'

test('uses CF-Connecting-IP only when the peer is Cloudflare', ({ assert }) => {
  assert.equal(resolveClientIp('172.68.230.145', '190.10.20.30'), '190.10.20.30')
  assert.equal(resolveClientIp('2606:4700::1', '190.10.20.30'), '190.10.20.30')
  // direct hit to origin with a spoofed header: keep the real peer
  assert.equal(resolveClientIp('45.1.2.3', '1.1.1.1'), '45.1.2.3')
  // garbage header from Cloudflare peer: keep peer
  assert.equal(resolveClientIp('172.68.230.145', 'not-an-ip'), '172.68.230.145')
  assert.equal(resolveClientIp('172.68.230.145', null), '172.68.230.145')
  assert.isNull(resolveClientIp(null, '1.1.1.1'))
})
