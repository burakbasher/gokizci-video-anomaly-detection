// app/(pages)/help/page.tsx
"use client";

import React from 'react';
import { HelpCircle, Tv, UserCog, Settings, PlaySquare, ListRestart, Eye, Clock, Zap, Navigation, ListChecks, Users, Fingerprint, ShieldCheck } from 'lucide-react';

// Kart stilini taklit etmek için bir yardımcı bileşen (isteğe bağlı)
const HelpCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode, titleColor?: string }> = ({ title, icon: Icon, children, titleColor = "text-primary" }) => (
    <div className="bg-background-surface border border-background-alt shadow-sm hover:shadow-md rounded-lg transition-all mb-6">
        <div className="p-4 md:p-5">
            <div className="flex items-center mb-3">
                <Icon className={`w-6 h-6 mr-3 ${titleColor === "text-primary" ? "text-primary" : titleColor}`} />
                <h2 className={`text-xl font-semibold ${titleColor}`}>
                    {title}
                </h2>
            </div>
            <div className="border-t border-background-alt -mx-4 md:-mx-5 mb-3"></div>
            <div className="text-sm text-primary-light space-y-2">
                {children}
            </div>
        </div>
    </div>
);

export default function HelpPage() {
    return (
        <div className="min-h-screen text-primary px-4 py-8 md:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center mb-3 bg-background-surface p-3 rounded-full shadow">
                        <HelpCircle className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-6xl font-bold">
                        <span className="text-primary">Gök</span>
                        <span className="text-primary-light">izci</span>
                    </p>
                    <p className="text-md text-primary-light mt-2">
                        Bu dijital rehber, Gökizci'nin tüm özelliklerini keşfetmeniz için tasarlandı.
                    </p>
                </header>

                <HelpCard title="Uygulamaya İlk Adım: Genel Bakış" icon={Navigation}>
                    <p>
                        Göz İzci, sizin dijital gözünüz olacak! Görüntü kaynaklarınızı anlık takip edin, geçmişin gizemli anlarını çözün ve önemli olayları şıp diye yakalayın.
                        Tek bir platformda canlı yayınlar, detaylı kayıt analizleri ve akıllı anomali tespitleri sizi bekliyor.
                    </p>
                </HelpCard>

                <HelpCard title="Ana Sayfa (Cihazlar)" icon={Tv}>
                    <p>
                        Uygulamaya adım attığınız anda sizi, tüm görüntüleme noktalarınızın birer yansıması olan cihaz kartları karşılar. Burası sizin operasyon merkeziniz!
                    </p>
                    <ul className="list-none space-y-2 mt-2">
                        <li>
                            <strong className="text-primary-dark">✨ Cihaz Kartları:</strong> Her bir kart, bir kameranın dijital kimliği gibidir. İsmi, anlık durumu (Yeşil ışıkla "Online" mı, yoksa kırmızıyla "Offline" mı?) ve ona özel yayın adresi bu kartlarda saklıdır.
                        </li>
                        <li>
                            <strong className="text-primary-dark">🚀 Bağlantı Kur:</strong> "Online" bir cihaza mı göz atmak istiyorsunuz? Kartına tıklayın veya "Bağlan" komutunu verin, anında izleme ekranına ışınlanın!
                        </li>
                        <li>
                            <strong className="text-primary-dark">👁️ Hızlı Bakış:</strong> Kartın üzerindeki sihirli ▶ ikonuna dokunarak, o an neler olup bittiğine dair minik bir canlı önizleme penceresi açabilirsiniz. Merakınızı anında giderin!
                        </li>
                    </ul>
                </HelpCard>

                <HelpCard title="İzleme Sayfası" icon={PlaySquare}>
                    <p>
                        Bir cihazla bağlantı kurduğunuzda bu sayfaya ulaşırsınız. Burada zaman sizin kontrolünüzde!
                    </p>
                    <div className="mt-3 space-y-3">
                        <div>
                            <h3 className="text-md font-medium text-primary-dark mb-1 flex items-center">
                                <Zap className="w-4 h-4 mr-2 text-green-500" />
                                Anlık Akış: Canlı Mod
                            </h3>
                            <p className="pl-6">
                                Varsayılan olarak "Live" modunda, olayları saniye saniye takip edersiniz. Her şey gözünüzün önünde, capcanlı!
                            </p>
                        </div>
                        <div>
                            <h3 className="text-md font-medium text-primary-dark mb-1 flex items-center">
                                <ListRestart className="w-4 h-4 mr-2 text-blue-500" />
                                Zaman Yolculuğu: Replay Modu
                            </h3>
                            <p className="mb-1 pl-6">
                                Geçmişe bir yolculuk yapmak için "Replay" düğmesine basın. Kayıtlar arasında gezinmek hiç bu kadar kolay olmamıştı.
                            </p>
                            <ul className="list-none space-y-1 pl-10">
                                <li>
                                    <strong className="text-primary-dark"><Clock className="w-3 h-3 inline-block mr-1 mb-px" /> Saat Kapsülü Seçimi:</strong> Sol paneldeki "Kayıt Saati Seçin" kumandasıyla, keşfetmek istediğiniz 1 saatlik zaman dilimini belirleyin. Seçiminizle birlikte, o saate ait tüm önemli veriler (kayıtlı anlar, dikkat çeken olaylar) anında zaman çizelgenize işlenir.
                                </li>
                                <li>
                                    <strong className="text-primary-dark">🎞️ Zaman Şeridi:</strong> Oynatıcının hemen altında, seçtiğiniz bir saatlik maceranın haritasını bulacaksınız.
                                    <span className="block text-xs text-gray-400 pl-4 mt-px">
                                        <span className="text-gray-500">Gri tonlar:</span> Kaydın aktığı dolu dolu saniyeler. <span className="text-red-500">Kırmızı vurgular:</span> "Burada bir şey var!" dedirten anomali dakikaları. <span className="text-black">Parlak beyaz çizgi:</span> Macerada tam olarak nerede olduğunuzu gösterir.
                                    </span>
                                </li>
                                <li>
                                    <strong className="text-primary-dark">⏯️ Kontrol Sizde:</strong> Oynat/Duraklat ile akışı yönetin, zaman şeridinde dilediğiniz noktaya ışınlanın.
                                </li>
                                <li>
                                    <strong className="text-primary-dark"><ListChecks className="w-3 h-3 inline-block mr-1 mb-px" /> Anomali Günlüğü:</strong> Sağdaki panelde, o saat diliminde yakalanan tüm sıra dışı olaylar listelenir. Tek tıkla olayın merkezine!
                                </li>
                            </ul>
                        </div>
                    </div>
                </HelpCard>

                <HelpCard title="Ekip Yönetimi (Yönetici)" icon={Users} titleColor="text-red-600">
                    <p>
                        <ShieldCheck className="w-4 h-4 inline-block mr-1 mb-px text-red-500" />
                        Bu bölüm, "admin" rütbesine sahip kullanıcılar için özeldir. Navigasyon menüsündeki "Kullanıcılar" sekmesi, ekibe yeni üyeler katmak, mevcut yetkileri düzenlemek veya kullanıcıları sistemden ayırmak için sizin kontrol panelinizdir.
                    </p>
                </HelpCard>

                <HelpCard title="Kişisel Ayarlar: Profilim" icon={Fingerprint}>
                    <p>
                        Ekranın sağ üst köşesindeki isminize tıklayarak "Profilim" sayfasına ulaşın. Burada dijital kimliğinizi (kullanıcı adı, e-posta, parola) güncelleyebilirsiniz. Güvenliğiniz bizim için önemli!
                    </p>
                </HelpCard>

                <footer className="mt-10 pt-6 border-t border-background-alt text-center">
                    <p className="text-xs text-primary-light">
                        Merak ettiğiniz başka bir konu olursa veya bir engele takılırsanız, lütfen sistem yöneticinize bir sinyal gönderin. Yardım her zaman bir tık uzağınızda!
                    </p>
                </footer>
            </div>
        </div>
    );
}