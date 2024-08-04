// composables/useAuthState.ts
import { useAuth } from 'vue-clerk';
import { useState } from '#app';
import type { AuthObject } from '@clerk/backend/internal';

export function useAuthState() {
    const { isSignedIn } = useAuth();
    const serverInitialState = useState<AuthObject | undefined>(
        'clerk-initial-state'
    );

    function checkIsSignedIn(): boolean {
        if (import.meta.server) {
            const token = serverInitialState.value?.token;
            return !!token;
        }
        return isSignedIn.value === true;
    }

    return {
        isSignedIn: checkIsSignedIn(),
    };
}
