import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import SignInRedirect from '../views/SignInRedirect.vue';
import { useAuth } from 'vue-clerk';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/sign-in',
            name: 'signin',
            component: SignInRedirect,
        },
    ],
});

const enableForcedSignIn = false;

router.beforeEach(async (to, from, next) => {
    if (enableForcedSignIn) {
        let { isSignedIn } = useAuth();

        const publicPages = ['/sign-in'];
        const authRequired = !publicPages.includes(to.path);

        console.log(isSignedIn.value);
        if (isSignedIn.value === false && authRequired) {
            localStorage.setItem('redirect-target', to.fullPath);
            next('/sign-in');
        } else {
            if (isSignedIn.value === true && to.path === '/sign-in') {
                next('/');
            } else {
                next();
            }
        }
    } else {
        next();
    }
});

export default router;
