// Bootstrap JS bundle (dropdowns, modals, tooltips). Imported as
// a client-only side-effect so the component classes that depend
// on `data-bs-toggle` keep working without a runtime CDN load.
export default defineNuxtPlugin(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
});
