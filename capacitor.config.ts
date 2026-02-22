import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.shieldbiter.lyrecompanion',
    appName: 'Shieldbiter Lyre',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    android: {
        backgroundColor: '#0d0d15',
    },
};

export default config;
