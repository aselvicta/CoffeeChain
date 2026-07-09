import { Link } from 'react-router';
import { Mail, Phone, MapPin, ArrowRight, Clock3, Database, Handshake, KeyRound } from 'lucide-react';
import { Logo } from './logo';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function LandingPage() {
  const heroImage = new URL('../../assets/coffee_farmers.jpg', import.meta.url).href;
  const aboutImage = new URL('../../assets/coffee_store.jpg', import.meta.url).href;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-green-800 to-green-950 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="bg-white rounded-2xl p-3 shadow-xl">
              <Logo size="lg" variant="full" theme="dark" showText={false} />
            </div>
            <div className="flex items-center gap-3">
              <Link 
                to="/login"
                className="bg-white text-green-900 px-6 py-2.5 rounded-xl font-semibold hover:bg-green-50 transition-colors shadow-md inline-flex items-center gap-2"
              >
                Ingia
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-10 md:py-12">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                Mfumo wa Ufuatiliaji wa Usambazaji wa Mbolea ya Kahawa
              </h1>
              <p className="text-lg md:text-xl text-green-100 mb-6 leading-relaxed">
                Teknolojia ya kisasa inayowezesha ufuatiliaji wa pembejeo za kilimo na usambazaji wa mbolea kwa uwazi na usalama mkubwa katika mikoa yote ya Tanzania inayozalisha kahawa.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/login"
                  className="bg-white text-green-900 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition-colors inline-flex items-center gap-2"
                >
                  Ingia Mfumoni
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/signup"
                  className="bg-green-600 border-2 border-green-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-500 transition-colors inline-flex items-center gap-2"
                >
                  Jisajili Sasa
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a 
                  href="#kuhusu"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Jifunze Zaidi
                </a>
              </div>
            </div>
            <div className="relative md:-mt-8">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                <ImageWithFallback
                  src={heroImage}
                  alt="Coffee Plantation Tanzania"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-14 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Huduma Zetu
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Mfumo unaotoa suluhisho kamili kwa usimamizi wa pembejeo za kilimo na usambazaji wa mbolea
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: '01',
                title: 'Usalama wa Hali ya Juu',
                description: 'Teknolojia ya kisasa inayohakikisha usalama na uwazi wa data zote za mzunguko wa bidhaa.',
              },
              {
                label: '02',
                title: 'Ushirikiano wa Wakulima',
                description: 'Kuunganisha wakulima, vyama, na wakaguzi kwa ufanisi zaidi katika usambazaji wa pembejeo.',
              },
              {
                label: '03',
                title: 'Ufuatiliaji wa Usambazaji',
                description: 'Rekodi sahihi za usambazaji wa mbolea na matumizi kwa uwazi kamili.',
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <div className="mb-6">
                  <span className="inline-flex items-center justify-center text-green-700 text-3xl font-bold leading-none">
                    {feature.label}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="kuhusu" className="py-14 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <div className="aspect-[5/4] rounded-xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src={aboutImage}
                  alt="Fertilizer Distribution"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Kuhusu CoffeeChain
              </h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                CoffeeChain ni mfumo wa kidijitali unaotumia teknolojia ya kisasa kuhakikisha uwazi na usalama katika usambazaji wa pembejeo za kilimo na mbolea katika mikoa yote ya Tanzania inayozalisha kahawa.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: Clock3,
                    text: 'Ufuatiliaji wa usambazaji wa mbolea kwa wakati halisi',
                  },
                  {
                    icon: Database,
                    text: 'Rekodi salama za usambazaji wa mbolea',
                  },
                  {
                    icon: Handshake,
                    text: 'Ushirikiano bora kati ya wakulima na vyama',
                  },
                  {
                    icon: KeyRound,
                    text: 'Uthibitisho wa haraka kwa njia ya OTP',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <item.icon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-14 bg-green-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Jinsi Mfumo Unavyofanya Kazi
            </h2>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              Mchakato rahisi wa hatua tatu kwa ufanisi zaidi
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Wasambazaji Watuma Pembejeo',
                description: 'Wasambazaji wanatuma pembejeo za mbolea kwa maduka na vyama vilivyosajiliwa katika mikoa inayozalisha kahawa.',
              },
              {
                number: '02',
                title: 'Usambazaji kwa Wakulima',
                description: 'Maduka na vyama vinasambaza mbolea kwa wakulima wakitumia mfumo wa uthibitisho wa OTP.',
              },
              {
                number: '03',
                title: 'Ufuatiliaji wa Matumizi',
                description: 'Vyama na maduka vinafuatilia matumizi ya mbolea na kuthibitisha taarifa zote katika mfumo.',
              },
            ].map((step, index) => (
              <div key={index}>
                <div className="bg-white p-7 rounded-2xl shadow-lg border border-green-100 h-full">
                  <div className="text-5xl font-bold text-green-700 mb-3">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div id="mawasiliano" className="py-14 bg-green-900 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Wasiliana Nasi
              </h2>
              <p className="text-xl text-green-100">
                Tuko tayari kukusaidia na maswali yako yoyote
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-white/15 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">Barua Pepe</h3>
                <p className="text-green-100">info@coffeechain.go.tz</p>
              </div>

              <div className="text-center">
                <div className="bg-white/15 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">Simu</h3>
                <p className="text-green-100">+255 28 222 1234</p>
              </div>

              <div className="text-center">
                <div className="bg-white/15 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">Mahali</h3>
                <p className="text-green-100">Ofisi Kuu, Dar es Salaam</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white text-green-950 py-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-6">
            <div className="md:col-span-2">
              <Logo size="md" variant="full" theme="dark" showText={false} />
              <p className="mt-4 text-gray-600">
                Mfumo wa uhakiki na usalama wa pembejeo za kilimo na usambazaji wa mbolea.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Viungo Muhimu</h3>
              <ul className="space-y-2">
                <li><a href="#kuhusu" className="text-gray-600 hover:text-green-800 transition-colors">Kuhusu</a></li>
                <li><a href="#mawasiliano" className="text-gray-600 hover:text-green-800 transition-colors">Mawasiliano</a></li>
                <li><Link to="/login" className="text-gray-600 hover:text-green-800 transition-colors">Ingia Mfumo</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Washirika</h3>
              <ul className="space-y-2">
                <li className="text-gray-600">Tanzania Coffee Board</li>
                <li className="text-gray-600">Tanzania Fertilizer Regulatory Authority (TFRA)</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center text-gray-600">
            <p>&copy; 2026 CoffeeChain. Haki zote zimehifadhiwa. Tanzania Coffee Board.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}