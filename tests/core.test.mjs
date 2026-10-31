import test from 'node:test';
import assert from 'node:assert/strict';
import { isDuplicate, normalizePhone, parseCsv, personalizeMessage, whatsappUrl } from '../src/lib/core.ts';

test('normalizes Nigerian phone numbers', () => {
  assert.equal(normalizePhone('0803 123 4567'), '2348031234567');
  assert.equal(normalizePhone('+234 803 123 4567'), '2348031234567');
});
test('personalizes only approved name placeholders', () => {
  const result = personalizeMessage('Acme');
  assert.match(result, /^Acme IS LOSING SIGNIFICANT CUSTOMERS ON GOOGLE\./);
  assert.match(result, /Acme is losing potential customers/);
  assert.match(result, /I'm Martin from MB CoreX 😊/);
});
test('detects duplicates by phone or name and city', () => {
  const rows = [{ name: 'Acme', city: 'Lagos', phone: '08031234567' }];
  assert.equal(isDuplicate({ phone: '+2348031234567' }, rows), true);
  assert.equal(isDuplicate({ name: 'acme', city: 'lagos' }, rows), true);
  assert.equal(isDuplicate({ name: 'Different', city: 'Lagos' }, rows), false);
});
test('creates click to chat URLs with encoded text', () => {
  assert.match(whatsappUrl('08031234567', 'Hello there'), /^https:\/\/wa\.me\/2348031234567\?text=Hello%20there$/);
});
test('parses quoted CSV fields and escaped quotes', () => {
  assert.deepEqual(parseCsv('name,notes\nAcme,"hello, ""world"""'), [['name','notes'],['Acme','hello, "world"']]);
});
