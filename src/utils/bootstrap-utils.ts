interface BootstrapModal {
    hide: () => void;
    show: () => void;
}

export interface BootstrapToast {
    show: () => void;
    hide: () => void;
    dispose: () => void;
}

interface BootstrapGlobal {
    bootstrap?: {
        Modal?: {
            getInstance: (el: HTMLElement | null) => BootstrapModal | null;
        };
        Toast?: new (el: HTMLElement) => BootstrapToast;
    };
}

export function getBootstrapModal(
    el: HTMLElement | null
): BootstrapModal | null {
    const g = globalThis as BootstrapGlobal;
    return g.bootstrap?.Modal?.getInstance(el) ?? null;
}

export function createBootstrapToast(
    el: HTMLElement | null
): BootstrapToast | null {
    if (!el) return null;
    const g = globalThis as BootstrapGlobal;
    const ToastClass = g.bootstrap?.Toast;
    if (!ToastClass) return null;
    return new ToastClass(el);
}
