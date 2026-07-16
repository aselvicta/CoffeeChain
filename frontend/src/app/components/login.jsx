import { useState } from 'react';
import { Link } from 'react-router';
import { Loader2, Lock, User } from 'lucide-react';
import { useLanguage } from './language-context';
import { Logo } from './logo';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getUserMessage } from '../utils/user-messages';

export function Login({ onLogin }) {
  const { t, language } = useLanguage();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = credentials.username.trim().length > 0 && credentials.password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!credentials.username.trim() || !credentials.password) {
      setError(
        language === 'en'
          ? 'Username and password are required.'
          : 'Jina la mtumiaji na nywila zinahitajika.'
      );
      return;
    }
    setLoading(true);

    try {
      await onLogin({
        username: credentials.username.trim(),
        password: credentials.password,
      });
    } catch (err) {
      setError(
        getUserMessage(
          err,
          language === 'en'
            ? 'Incorrect username or password.'
            : 'Jina la mtumiaji au nywila si sahihi.'
        )
      );
    } finally {
      setLoading(false);
    }
  };
  
  const bgTopLeft = new URL('../../assets/coffee_farmers.jpg', import.meta.url).href;
  const bgBottomRight = new URL('../../assets/distribution_truck.jpeg', import.meta.url).href;
  const headerPattern = new URL('../../assets/truck_inside_warehouse.jpg', import.meta.url).href;
  const logoSrc = new URL('../../assets/logo.png', import.meta.url).href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4 relative">
      {/* Background Images */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
        <div className="absolute top-0 left-0 w-1/2 h-2/3">
          <ImageWithFallback
            src={bgTopLeft}
            alt="Coffee Plantation"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute bottom-0 right-0 w-1/2 h-2/3">
          <ImageWithFallback
            src={bgBottomRight}
            alt="Supply Chain"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="absolute inset-0 bg-white/10"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-green-100">
          {/* Header */}
          <div className="bg-white text-center relative overflow-hidden h-72">
            <div className="h-full w-full flex items-center justify-center p-10">
              <img
                src={logoSrc}
                alt="CoffeeChain logo"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
          </div>

          {/* Login Form */}
          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  {language === 'en' ? 'Username' : 'Jina la Mtumiaji'}
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials({ ...credentials, username: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder={language === 'en' ? 'Enter username' : 'Weka jina la mtumiaji'}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  {language === 'en' ? 'Password' : 'Nywila'}
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder={language === 'en' ? 'Enter password' : 'Weka nywila'}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading
                  ? language === 'en'
                    ? 'Logging in…'
                    : 'Inaingia…'
                  : language === 'en'
                    ? 'Login to CoffeeChain'
                    : 'Ingia CoffeeChain'}
              </button>

              <p className="text-center text-sm text-gray-500">
                {language === 'en' ? "Don't have an account?" : 'Huna akaunti?'}{' '}
                <Link
                  to="/signup"
                  className="text-green-700 font-semibold hover:underline"
                >
                  {language === 'en' ? 'Register here' : 'Jisajili hapa'}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}