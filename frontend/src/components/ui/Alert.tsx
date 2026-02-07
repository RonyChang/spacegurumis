import React from 'react';

type Tone = 'info' | 'success' | 'error';

export default function Alert({
    tone = 'info',
    children,
}: {
    tone?: Tone;
    children: React.ReactNode;
}) {
    const className = ['status', tone === 'success' ? 'status--success' : '', tone === 'error' ? 'status--error' : '']
        .filter(Boolean)
        .join(' ');

    return <p className={className}>{children}</p>;
}

