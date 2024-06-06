import React from 'react';

interface ButtonProps {
    onClick: () => unknown;
    disabled?: boolean;
    width?: number;
    children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ onClick, disabled, width, children }) => (
    <button onClick={onClick} disabled={disabled} style={{ width: width ?? 100 }} >
        {children}
    </button>
);