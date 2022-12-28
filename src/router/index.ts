import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/results',
            name: 'results',
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import('../views/ResultsView.vue'),
        },
        {
            path: '/standings',
            name: 'standings',
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import('../views/DriverStandings.vue'),
        },
        {
            path: '/driver',
            name: 'driver',
            component: () => import('../views/DriverView.vue'),
        },
        {
            path: '/track',
            name: 'track',
            props: true,
            component: () => import('../views/TrackResults.vue'),
        },
    ],
});

export default router;
