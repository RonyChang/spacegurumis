const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPasswordResetEmailText } = require('../src/services/passwordResetEmail.service');

test('buildPasswordResetEmailText uses reset link when available', () => {
    const text = buildPasswordResetEmailText({
        resetLink: 'https://spacegurumis.lat/reset-password?token=abc',
        token: 'abc',
        ttlMinutes: 45,
    });

    assert.match(text, /Usa este enlace:/);
    assert.match(text, /45 minutos/);
    assert.ok(!text.includes('Usa este token:'));
});

test('buildPasswordResetEmailText falls back to raw token when link is not available', () => {
    const text = buildPasswordResetEmailText({
        resetLink: null,
        token: 'token-demo',
        ttlMinutes: 30,
    });

    assert.match(text, /Usa este token: token-demo/);
    assert.match(text, /30 minutos/);
});
