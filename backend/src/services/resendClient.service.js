const RESEND_API_URL = 'https://api.resend.com/emails';

function getResendConfig() {
    const apiKey = process.env.RESEND_API_KEY || '';
    const from = process.env.RESEND_FROM || '';

    if (!apiKey) {
        throw new Error('RESEND_API_KEY no configurado');
    }

    if (!from) {
        throw new Error('RESEND_FROM no configurado');
    }

    return { apiKey, from };
}

async function sendEmail({ to, subject, text, html }) {
    const { apiKey, from } = getResendConfig();
    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: recipients,
            subject,
            text,
            html,
        }),
    });

    if (!response.ok) {
        let detail = '';
        try {
            const payload = await response.json();
            detail = payload && payload.message ? payload.message : '';
        } catch (error) {
            detail = '';
        }

        const message = detail ? `Resend error: ${detail}` : 'Resend error';
        throw new Error(message);
    }

    return response.json();
}

module.exports = {
    sendEmail,
};
