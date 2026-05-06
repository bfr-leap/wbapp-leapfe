export interface ScopeOption {
    display: string;
    href: string;
}

export interface ScopeDimension {
    key: string;
    label: string;
    selected: string;
    options: ScopeOption[];
    priority?: 'primary' | 'secondary';
    mono?: boolean;
}
