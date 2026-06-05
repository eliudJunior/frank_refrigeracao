const test = require('node:test');
const assert = require('node:assert');
const { sanitizeSlug, sanitizeContent } = require('./gerar-post');

test('sanitizeSlug should remove path traversal characters and keep URL safe ones', () => {
  const maliciousSlug = '../../etc/passwd';
  const result = sanitizeSlug(maliciousSlug);
  assert.strictEqual(result, 'etcpasswd');
  
  const validSlug = 'test-post-123_abc';
  assert.strictEqual(sanitizeSlug(validSlug), 'test-post-123_abc');
});

test('sanitizeContent should strip scripts and handlers', () => {
  const maliciousHtml = '<p>Hello</p><script>alert("hack")</script><img src=x onerror=alert(1)>';
  const result = sanitizeContent(maliciousHtml);
  assert.ok(!result.includes('<script>'));
  assert.ok(!result.includes('onerror'));
  assert.ok(result.includes('<p>Hello</p>'));
});
