import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'dark';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
    const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ');
    return <button {...props} className={classes} />;
}

