import { NextResponse } from 'next/server';

// Fallback static list jika VAK-SMS gagal
const FALLBACK_COUNTRIES = [
    { code: 'id', name: 'Indonesia', flag: '🇮🇩', operators: ['any'] },
    { code: 'ru', name: 'Russia', flag: '🇷🇺', operators: ['any', 'tele2', 'megafon', 'beeline', 'mts'] },
    { code: 'us', name: 'United States', flag: '🇺🇸', operators: ['any'] },
    { code: 'ph', name: 'Philippines', flag: '🇵🇭', operators: ['any'] },
    { code: 'my', name: 'Malaysia', flag: '🇲🇾', operators: ['any'] },
];

export async function GET() {
    try {
        // 1. Fetch Dynamic Countries from VAK-SMS
        let dynamicCountries: any[] = [];
        try {
            const res = await fetch('https://moresms.net/api/getCountryList/', {
                method: 'GET',
                // Adding a timeout signature via AbortController if possible, but basic fetch is okay
                cache: 'no-store'
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Normalize standard flag emojis based on countryCode (e.g. 'FR' -> 🇫🇷)
                    dynamicCountries = data.map((c: any) => {
                        const code = c.countryCode.toUpperCase();
                        let flag = '🌍';
                        if (code.length === 2 && code !== 'ANY') {
                            flag = String.fromCodePoint(
                                code.charCodeAt(0) + 127397,
                                code.charCodeAt(1) + 127397
                            );
                        }
                        return {
                            code: c.countryCode,
                            name: c.countryName,
                            flag: flag,
                            operators: c.operatorList || ['any']
                        };
                    });
                }
            }
        } catch (error) {
            console.error('[VAK-SMS] Failed to fetch country list:', error);
        }

        let countries = dynamicCountries.length > 0 ? dynamicCountries : FALLBACK_COUNTRIES;

        // Custom Sort: Indonesia (id) first, then alphabetically
        countries = countries.sort((a, b) => {
            if (a.code === 'id') return -1;
            if (b.code === 'id') return 1;
            return a.name.localeCompare(b.name);
        });

        // 2. Comprehensive Services Mapping 
        // Karena VAK-SMS menggunakan kode spesifik namun tidak memiliki endpoint dinamis untuk daftar aplikasi, kita hardcode semua yang ada di dokumentasi resmi.
        const rawServices = [
            { name: 'OpenAI', code: 'dr' },
            { name: 'WhatsApp', code: 'wa' },
            { name: 'VK - MailRu', code: 'mr' },
            { name: 'QIWI Wallet', code: 'qw' },
            { name: 'Cupis', code: 'cp' },
            { name: 'Tbank', code: 'tf' },
            { name: 'Microsoft', code: 'ms' },
            { name: 'Netflix', code: 'nf' },
            { name: 'Yoomoney', code: 'ym' },
            { name: 'AliExpress', code: 'ai' },
            { name: 'Instagram', code: 'ig' },
            { name: 'PayPal', code: 'pp' },
            { name: 'Uber', code: 'ub' },
            { name: 'Facebook', code: 'fb' },
            { name: 'Protonmail', code: 'pm' },
            { name: 'WebMoney', code: 'wm' },
            { name: 'Tencent QQ', code: 'qq' },
            { name: 'Nike', code: 'nk' },
            { name: 'AOL', code: 'ao' },
            { name: 'Line messenger', code: 'lm' },
            { name: 'Steam', code: 'st' },
            { name: 'Yalla', code: 'll' },
            { name: 'Viber', code: 'vi' },
            { name: 'AirBnb', code: 'ab' },
            { name: 'Discord', code: 'dc' },
            { name: 'Yandex', code: 'ya' },
            { name: 'Telegram', code: 'tg' },
            { name: 'WeChat', code: 'wc' },
            { name: 'Google', code: 'gl' },
            { name: 'Twitter', code: 'tw' },
            { name: 'Tiktok', code: 'tk' },
            { name: 'Tinder', code: 'td' },
            { name: 'Vkusno i tochka', code: 'md' },
            { name: 'Yahoo', code: 'yh' },
            { name: 'Cian', code: 'ca' },
            { name: 'Ebay', code: 'eb' },
            { name: 'cathay', code: 'ho' },
            { name: 'blok-post.ru', code: 'blp' },
            { name: 'Cofix', code: 'cf' },
            { name: 'ckassa', code: 'cks' },
            { name: 'Lenta', code: 'lt' },
            { name: 'Ingobank', code: 'igb' },
            { name: 'Coinbase', code: 'cb' },
            { name: 'Solar-staff', code: 'ss' },
            { name: '150bar', code: 'ar' },
            { name: 'KFC', code: 'kf' },
            { name: 'DiDi taxi', code: 'dd' },
            { name: 'EscapeFromTarkov', code: 'ah' },
            { name: 'Oskelly', code: 'osk' },
            { name: 'El-plat', code: 'ep' },
            { name: 'JDcom', code: 'jm' },
            { name: 'Palmsbet', code: 'pbt' },
            { name: 'Rocketreach', code: 'rk' },
            { name: 'werewolf.53site', code: 'wer' },
            { name: 'Wise', code: 'ws' },
            { name: 'alias_', code: 'als' },
            { name: 'Buff.163', code: 'bf' },
            { name: 'Gazprom', code: 'gp' },
            { name: 'CDEK', code: 'dk' },
            { name: 'Bolt', code: 'ol' },
            { name: 'Dostavista', code: 'di' },
            { name: 'Kant', code: 'knt' },
            { name: 'SberZdorovye', code: 'sbz' },
            { name: 'Backbone', code: 'bde' },
            { name: '32Red', code: 'rd' },
            { name: 'VINTED', code: 'vnt' },
            { name: 'Steemit', code: 'ste' },
            { name: 'Amazon', code: 'am' },
            { name: 'Blablacar', code: 'bb' },
            { name: 'Vkusvill', code: 'vv' },
            { name: 'Khl', code: 'fkhk' },
            { name: 'Battle', code: 'bt' },
            { name: 'Magicbet', code: 'mbt' },
            { name: 'Grab', code: 'ga' },
            { name: 'Getir', code: 'ge' },
            { name: 'inDriver', code: 'rl' },
            { name: 'Naver', code: 'nv' },
            { name: 'Galamart', code: 'gal' },
            { name: 'Monese', code: 'me' },
            { name: 'Rediff.com', code: 'mrf' },
            { name: 'lovicashback', code: 'lcb' },
            { name: 'Bumble', code: 'bm' },
            { name: 'bushe', code: 'bsh' },
            { name: 'Phillip Morris', code: 'prs' },
            { name: 'leboncoin', code: 'lcn' },
            { name: 'Pivko24', code: 'pv' },
            { name: 'RuVDS', code: 'rv' },
            { name: 'Xiaomi', code: 'xi' },
            { name: 'Mileonair', code: 'mnr' },
            { name: 'Checkin', code: 'ci' },
            { name: 'Fiverr', code: 'fr' },
            { name: 'Burger King', code: 'bk' },
            { name: 'PochtaBank', code: 'pbk' },
            { name: 'Revolut', code: 'rt' },
            { name: 'Huya.com', code: 'hy' },
            { name: 'Betfair', code: 'bfr' },
            { name: 'Bethub', code: 'bhb' },
            { name: 'Foodpanda', code: 'fa' },
            { name: 'Coffee LIKE', code: 'ec' },
            { name: 'OBI.RU', code: 'obi' },
            { name: 'MyGLO', code: 'ae' },
            { name: 'avtomag.club', code: 'avc' },
            { name: 'Checkscan', code: 'chs' },
            { name: 'MKB', code: 'mkb' },
            { name: 'OTP bank', code: 'otp' },
            { name: 'thediversity', code: 'hi' },
            { name: 'Tekhnopark', code: 'tpk' },
            { name: 'Grindr', code: 'gd' },
            { name: 'Shaverno', code: 'shr' },
            { name: 'GMX.com', code: 'abk' },
            { name: 'Stormgain', code: 'sn' },
            { name: '1688', code: 'hn' },
            { name: 'Paysend', code: 'pd' },
            { name: 'Rencredit', code: 'rc' },
            { name: 'Alfagift', code: 'ag' },
            { name: 'Zolotoye Yabloko', code: 'gap' },
            { name: 'Citilink', code: 'cl' },
            { name: 'Winelab', code: 'wn' },
            { name: 'bet365', code: 'ef' },
            { name: 'Spar', code: 'sr' },
            { name: 'Letual', code: 'le' },
            { name: 'Bank Avangard', code: 'bvg' },
            { name: 'Huawei', code: 'hu' },
            { name: 'Ubisoft', code: 'us' },
            { name: 'Unistream', code: 'un' },
            { name: 'Bazar-store', code: 'bas' },
            { name: 'Casino Online', code: 'co' },
            { name: 'holodilnik.ru', code: 'hld' },
            { name: 'MiChat', code: 'mh' },
            { name: 'Ozan', code: 'aaz' },
            { name: 'claude', code: 'acz' },
            { name: 'Mozen', code: 'mz' },
            { name: 'OLX', code: 'ox' },
            { name: 'Manus', code: 'bwv' },
            { name: 'Efbet', code: 'ebt' },
            { name: 'Weplay', code: 'pw' },
            { name: 'Epicnpc', code: 'nc' },
            { name: 'TaxiMaxim', code: 'tm' },
            { name: 'FixPrice', code: 'fp' },
            { name: 'clipdrop.co', code: 'cdp' },
            { name: 'inpost.pl', code: 'inp' },
            { name: 'mail.kz', code: 'mkz' },
            { name: 'remi', code: 'rmi' },
            { name: 'stalker-co', code: 'str' },
            { name: 'hh.ru', code: 'hh' },
            { name: 'bethowen.ru', code: 'bth' },
            { name: 'familia', code: 'fml' },
            { name: 'Shopee', code: 'sh' },
            { name: 'Taobao', code: 'tb' },
            { name: 'Papara', code: 'pr' },
            { name: 'salton-promo', code: 'spr' },
            { name: 'VTB', code: 'vt' },
            { name: 'Cloud', code: 'scd' },
            { name: 'kotanyipromo', code: 'ktn' },
            { name: 'Pikabu', code: 'pkb' },
            { name: 'namars', code: 'mrs' },
            { name: 'Wolt', code: 'ot' },
            { name: 'kolhoz.ru', code: 'klh' },
            { name: 'Sovkombank', code: 'svb' },
            { name: 'Kvartplata.ru', code: 'kp' },
            { name: 'GCash', code: 'gca' },
            { name: 'Jingdong', code: 'jd' },
            { name: 'Weibo', code: 'wi' },
            { name: 'Elitbet', code: 'elb' },
            { name: 'Hinge', code: 'vz' },
            { name: 'Apple', code: 'al' },
            { name: 'Mamba', code: 'mmb' },
            { name: 'Bilety v kino', code: 'zj' },
            { name: 'Bixin', code: 'bxn' },
            { name: 'Lamoda', code: 'sb' },
            { name: 'Everbet', code: 'evb' },
            { name: 'KakaoTalk', code: 'kt' },
            { name: 'Ftx', code: 'fx' },
            { name: 'Signal', code: 'sig' },
            { name: 'Bluesky', code: 'sky' },
            { name: 'GoogleVoice', code: 'gf' },
            { name: 'Twitch', code: 'th' },
            { name: 'Verny', code: 'vn' },
            { name: 'Amar - Chat', code: 'ach' },
            { name: 'Winbet', code: 'wbt' },
            { name: 'Vsesmart.ru', code: 'sar' },
            { name: 'Kikshering', code: 'sk' },
            { name: 'Okcupid', code: 'oc' },
            { name: 'Craigslist', code: 'crg' },
            { name: 'Ozon', code: 'oz' },
            { name: 'Cstar', code: 'rx' },
            { name: 'Dikidi', code: 'dkd' },
            { name: 'Dropverse', code: 'dro' },
            { name: 'MICO', code: 'mi' },
            { name: 'Teboil', code: 'tbl' },
            { name: 'Betano', code: 'btn' },
            { name: 'Fotka', code: 'ftk' },
            { name: 'ati su', code: 'bhl' },
            { name: '24u', code: '24u' },
            { name: 'Weststeincard', code: 'wcd' },
            { name: 'OlduBil', code: 'ob' },
            { name: 'Slotino', code: 'sln' },
            { name: 'Coolclever', code: 'cv' },
            { name: 'AliPay', code: 'ap' },
            { name: 'Paysafecard', code: 'pc' },
            { name: 'Fameex', code: 'fm' },
            { name: 'Tilda', code: 'ld' },
            { name: 'Badoo', code: 'jz' },
            { name: 'Sparty-Group', code: 'sgr' },
            { name: 'Genome', code: 'nom' },
            { name: 'FunPay', code: 'up' },
            { name: 'Rambler', code: 'rm' },
            { name: 'DDX Fitness', code: 'ddx' },
            { name: 'Alfa-Bank', code: 'af' },
            { name: 'Weco', code: 'wo' },
            { name: 'Ticketmaster.com', code: 'tz' },
            { name: 'Atlasbus.by', code: 'atl' },
            { name: 'Vivaldi', code: 'vd' },
            { name: 'Mobileproxy', code: 'my' },
            { name: 'Chime', code: 'chm' },
            { name: 'Hoff', code: 'bcf' },
            { name: 'Bigo Live', code: 'be' },
            { name: 'TradingView', code: 'tv' },
            { name: 'Apteki', code: 'at' },
            { name: 'MyBeautyBonus', code: 'yb' },
            { name: 'Blibli', code: 'fk' },
            { name: 'Seafood-shop', code: 'sfs' },
            { name: 'Baidu', code: 'dbu' },
            { name: 'Subito', code: 'sbt' },
            { name: 'Wish', code: 'wh' },
            { name: 'wpk', code: 'wpk' },
            { name: 'Paddy power', code: 'ppr' },
            { name: 'kopilkaclub', code: 'kc' },
            { name: 'Yubo', code: 'yu' },
            { name: 'Blizzard', code: 'bz' }
        ];

        // Map colors randomly or deterministically for aesthetics
        const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500', 'bg-rose-500'];
        const services = rawServices.map((s, index) => ({
            ...s,
            color: s.code === 'wa' ? 'bg-green-500' :
                s.code === 'tg' ? 'bg-cyan-500' :
                    s.code === 'fb' ? 'bg-blue-600' :
                        s.code === 'ig' ? 'bg-pink-600' :
                            s.code === 'tw' ? 'bg-black' :
                                s.code === 'tk' ? 'bg-gray-900' :
                                    colors[index % colors.length], // Fallback auto styling
            icon: 'MessageSquare' // Generic icon that handled by Frontend
        }));


        return NextResponse.json({
            success: true,
            data: {
                services,
                countries
            }
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error while fetching services' }, { status: 500 });
    }
}
