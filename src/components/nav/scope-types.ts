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
    /**
     * When true the chip can shrink below its content size and
     * its value truncates with an ellipsis. Use for dimensions
     * with potentially long titles (e.g. a subsession round
     * "Silverstone Circuit - Super Formula SF23 - Sprint Race").
     * Short, stable values should leave this unset so they
     * render at their natural width.
     */
    truncate?: boolean;
}
