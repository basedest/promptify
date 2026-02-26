'use client';

import { create } from 'zustand';

type AuthDialogState = {
    open: boolean;
    defaultTab: 'signin' | 'signup';
    /** When set, shows the "check your email" view with resend option */
    checkEmailFor: string | null;
    openSignIn: () => void;
    openSignUp: () => void;
    showCheckEmail: (email: string) => void;
    backFromCheckEmail: () => void;
    close: () => void;
};

export const useAuthDialog = create<AuthDialogState>((set) => ({
    open: false,
    defaultTab: 'signin',
    checkEmailFor: null,
    openSignIn: () => set({ open: true, defaultTab: 'signin', checkEmailFor: null }),
    openSignUp: () => set({ open: true, defaultTab: 'signup', checkEmailFor: null }),
    showCheckEmail: (email) => set({ checkEmailFor: email }),
    backFromCheckEmail: () => set({ checkEmailFor: null }),
    close: () => set({ open: false, checkEmailFor: null }),
}));
