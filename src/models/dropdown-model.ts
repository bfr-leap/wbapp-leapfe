export interface DropdownModel {
    selected: string;
    options: { display: string; href: string }[];
}

export function getDefaultDropdownModel(): DropdownModel {
    return JSON.parse(
        JSON.stringify({
            selected: '---',
            options: [
                { display: '--', href: '#' },
                { display: '---', href: '#' },
            ],
        })
    );
}
