import React from 'react';

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
};

export default function TextField({ label, className = '', ...props }: TextFieldProps) {
    const classes = ['field__input', className].filter(Boolean).join(' ');

    return (
        <label className="field">
            <span className="field__label">{label}</span>
            <input {...props} className={classes} />
        </label>
    );
}

