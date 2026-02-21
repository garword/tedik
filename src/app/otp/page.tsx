import OTPDashboard from './OTPDashboard';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sewa Nomor Virtual Murah | VAK-SMS OTP',
    description: 'Layanan sewa nomor virtual sementara termurah untuk verifikasi WhatsApp, Telegram, Instagram & lainnya secara otomatis.',
};

export default function OTPPage() {
    return (
        <>
            <OTPDashboard />
            <Footer />
        </>
    );
}
