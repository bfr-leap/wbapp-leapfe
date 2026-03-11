interface BootstrapModal {
    hide: () => void;
    show: () => void;
}

interface BootstrapGlobal {
    bootstrap?: {
        Modal?: {
            getInstance: (
                el: HTMLElement | null
            ) => BootstrapModal | null;
        };
    };
}

export function getBootstrapModal(
    el: HTMLElement | null
): BootstrapModal | null {
    const g = globalThis as BootstrapGlobal;
    return g.bootstrap?.Modal?.getInstance(el) ?? null;
}
