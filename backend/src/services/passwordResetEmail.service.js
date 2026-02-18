function buildPasswordResetEmailText({ resetLink, token, ttlMinutes }) {
    const safeTtlMinutes = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? Math.floor(ttlMinutes) : 30;

    if (resetLink) {
        return [
            'Recibimos una solicitud para restablecer tu contraseña.',
            `Usa este enlace: ${resetLink}`,
            `Este enlace expira en ${safeTtlMinutes} minutos.`,
            'Si no solicitaste este cambio, puedes ignorar este mensaje.',
        ].join('\n');
    }

    return [
        'Recibimos una solicitud para restablecer tu contraseña.',
        `Usa este token: ${token}`,
        `Este token expira en ${safeTtlMinutes} minutos.`,
        'Si no solicitaste este cambio, puedes ignorar este mensaje.',
    ].join('\n');
}

module.exports = {
    buildPasswordResetEmailText,
};
