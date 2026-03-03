import SeoSettingsForm from '@/components/features/admin/SeoSettingsForm';

export default function AdminSeoPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-0">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">SEO Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Kelola tampilan toko Anda di Google, sitemap, dan metadata semua halaman.
                </p>
            </div>
            <SeoSettingsForm />
        </div>
    );
}
