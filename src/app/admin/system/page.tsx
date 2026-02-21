import SystemEndpoints from '@/components/admin/SystemEndpoints';

export const metadata = {
    title: 'System Endpoints | Admin Dashboard',
};

export default function SystemPage() {
    // Membaca kata sandi cron secara server-side
    const cronSecret = process.env.CRON_SECRET || 'ganti_di_env_cron_secret';

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System & API Endpoints</h1>
                    <p className="text-gray-500">Daftar URL penting untuk integrasi pihak ketiga & monitoring.</p>
                </div>
            </div>

            <SystemEndpoints cronSecret={cronSecret} />
        </div>
    );
}
