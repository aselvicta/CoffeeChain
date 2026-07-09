import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft, Building2, CheckCircle, Eye, EyeOff,
  Leaf, Lock, Mail, MapPin, Phone, ShieldCheck, Store, User, Users,
} from 'lucide-react';
import { registerPublic } from '../api/client';
import { REGION_LIST, TANZANIA_REGIONS } from '../data/tanzania-locations';
import { ImageWithFallback } from './figma/ImageWithFallback';

const bgTopLeft       = new URL('../../assets/coffee_farmers.jpg',         import.meta.url).href;
const bgBottomRight   = new URL('../../assets/distribution_truck.jpeg',    import.meta.url).href;
const logoSrc         = new URL('../../assets/logo.png',                   import.meta.url).href;

const ROLE_OPTIONS = [
  {
    value: 'supplier',
    label: 'Supplier',
    description: 'Fertilizer supplier distributing to branches',
    icon: Building2,
    ring: 'ring-green-600',
    bg: 'bg-white border-gray-300 hover:border-gray-500',
    activeBg: 'bg-white border-green-600',
    dot: 'bg-green-600',
  },
  {
    value: 'retailer',
    label: 'Retailer',
    description: 'Retail outlet selling fertilizer to farmers',
    icon: Store,
    ring: 'ring-green-600',
    bg: 'bg-white border-gray-300 hover:border-gray-500',
    activeBg: 'bg-white border-green-600',
    dot: 'bg-green-600',
  },
  {
    value: 'cooperative',
    label: 'Cooperative (AMCOS)',
    description: 'Farmer cooperative managing member fertilizer',
    icon: Users,
    ring: 'ring-green-600',
    bg: 'bg-white border-gray-300 hover:border-gray-500',
    activeBg: 'bg-white border-green-600',
    dot: 'bg-green-600',
  },
];

function FieldLabel({ children, required, optional }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
      {optional && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
    </label>
  );
}

function TextInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      )}
      <input
        className={`w-full border border-gray-300 rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400 ${Icon ? 'pl-10 pr-4' : 'px-4'} ${className}`}
        {...props}
      />
    </div>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    role: '',
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    organisation_name: '',
    contact_phone: '+255 ',
    region: '',
    district: '',
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setRegion = (e) => setForm((prev) => ({ ...prev, region: e.target.value, district: '' }));

  const canProceedStep1 = !!form.role;

  const passwordsMatch = confirmPassword.length === 0 || form.password === confirmPassword;
  const passwordConfirmed = form.password.length >= 6 && confirmPassword === form.password;

  const canProceedStep2 =
    form.username.trim().length >= 3 &&
    passwordConfirmed &&
    form.first_name.trim().length >= 1 &&
    form.last_name.trim().length >= 1 &&
    form.email.trim().includes('@') &&
    form.organisation_name.trim().length >= 2 &&
    form.contact_phone.trim().length >= 9 &&
    form.region.trim().length > 0 &&
    form.district.trim().length > 0;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await registerPublic({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        organisation_name: form.organisation_name.trim(),
        contact_phone: form.contact_phone.trim(),
        region: form.region,
        district: form.district.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
          <div className="absolute top-0 left-0 w-1/2 h-2/3">
            <ImageWithFallback src={bgTopLeft} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 w-1/2 h-2/3">
            <ImageWithFallback src={bgBottomRight} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="absolute inset-0 bg-white/20" />
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-green-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-gray-600 mb-3">
            Your account request has been submitted. An administrator will review your details and contact you to activate your account.
          </p>
          <p className="text-sm text-gray-500 mb-6 bg-green-50 rounded-lg py-2 px-4">
            Registered as: <span className="font-semibold text-green-700">{form.organisation_name}</span>
          </p>
          <Link
            to="/login"
            className="block w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 transition-colors shadow-md"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4 relative">
      {/* Background images */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        <div className="absolute top-0 left-0 w-1/2 h-2/3">
          <ImageWithFallback src={bgTopLeft} alt="Coffee Plantation" className="w-full h-full object-cover" />
        </div>
        <div className="absolute bottom-0 right-0 w-1/2 h-2/3">
          <ImageWithFallback src={bgBottomRight} alt="Supply Chain" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="absolute inset-0 bg-white/10" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-green-100">

          {/* Header with logo */}
          <div className="bg-white text-center relative overflow-hidden" style={{ height: '130px' }}>
            <div className="h-full w-full flex items-center justify-center px-8 py-3">
              <img
                src={logoSrc}
                alt="CoffeeChain logo"
                className="h-full w-auto object-contain"
                loading="eager"
              />
            </div>
            {/* Step progress strip */}
            <div className="absolute bottom-0 left-0 right-0 flex h-1">
              <div className={`flex-1 transition-all duration-300 ${step >= 1 ? 'bg-green-600' : 'bg-gray-200'}`} />
              <div className={`flex-1 transition-all duration-300 ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
            </div>
          </div>

          {/* Heading row */}
          <div className="px-7 pt-4 pb-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create Account</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {step === 1
                    ? 'Step 1 of 2 — Choose your account type'
                    : 'Step 2 of 2 — Fill in your details'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2].map((s) => (
                  <div
                    key={s}
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      s <= step
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {s < step ? <CheckCircle className="h-3.5 w-3.5" /> : s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-7 pb-6 pt-3">

            {/* ── Step 1: Role selection ──────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Prominent heading */}
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">Select your role</p>
                  <p className="text-sm text-gray-500 mt-0.5">Choose the one that best describes your organisation</p>
                </div>

                {/* Compact, simple role chips */}
                <div className="grid grid-cols-3 gap-3">
                  {ROLE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = form.role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, role: opt.value }))}
                        className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                          active
                            ? `${opt.activeBg} ring-2 ${opt.ring}`
                            : `${opt.bg} hover:brightness-95`
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-gray-800' : 'text-gray-500'}`} />
                        <span className="text-xs font-semibold text-gray-800 leading-tight">{opt.label}</span>
                        {active && (
                          <span className="absolute top-1.5 right-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Short, visible admin notice */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-medium text-amber-800">
                    Admin approval required — you'll be contacted before your account is activated.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>

                <p className="text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-green-700 font-semibold hover:underline">Sign in</Link>
                </p>
              </div>
            )}

            {/* ── Step 2: Details form ────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm font-semibold text-green-700">
                    {ROLE_OPTIONS.find((r) => r.value === form.role)?.label}
                  </span>
                </div>

                {/* Section: Account credentials */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Account Credentials
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Username</FieldLabel>
                      <TextInput
                        icon={User}
                        value={form.username}
                        onChange={set('username')}
                        placeholder="Choose a username (min 3 chars)"
                        minLength={3}
                      />
                    </div>
                    <div>
                      <FieldLabel required>Password</FieldLabel>
                      <div className="relative">
                        <TextInput
                          icon={Lock}
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={set('password')}
                          placeholder="At least 6 characters"
                          minLength={6}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {form.password.length > 0 && form.password.length < 6 && (
                        <p className="text-xs text-red-500 mt-0.5">Minimum 6 characters</p>
                      )}
                    </div>
                    <div>
                      <FieldLabel required>Confirm Password</FieldLabel>
                      <div className="relative">
                        <TextInput
                          icon={Lock}
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className={`pr-9 ${!passwordsMatch ? 'border-red-400 focus:ring-red-400' : confirmPassword && passwordsMatch ? 'border-green-500 focus:ring-green-500' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {!passwordsMatch && (
                        <p className="text-xs text-red-500 mt-0.5">Passwords do not match</p>
                      )}
                      {passwordsMatch && passwordConfirmed && (
                        <p className="text-xs text-green-600 mt-0.5">Passwords match ✓</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Personal information */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Personal Information
                  </h3>
                  <div className="grid grid-cols-3 gap-3.5">
                    <div>
                      <FieldLabel required>First Name</FieldLabel>
                      <TextInput icon={User} value={form.first_name} onChange={set('first_name')} placeholder="First name" />
                    </div>
                    <div>
                      <FieldLabel required>Last Name</FieldLabel>
                      <TextInput value={form.last_name} onChange={set('last_name')} placeholder="Last name" />
                    </div>
                    <div>
                      <FieldLabel required>Contact Phone</FieldLabel>
                      <TextInput
                        icon={Phone}
                        type="tel"
                        value={form.contact_phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((p) => ({
                            ...p,
                            contact_phone: val.startsWith('+255') ? val : '+255 ',
                          }));
                        }}
                        placeholder="+255 7XX XXX XXX"
                      />
                    </div>
                    <div className="col-span-3">
                      <FieldLabel required>Email Address</FieldLabel>
                      <TextInput icon={Mail} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                    </div>
                  </div>
                </div>

                {/* Section: Organisation */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Organisation Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <FieldLabel required>
                        {form.role === 'supplier' ? 'Company / Organisation Name' : 'Branch / Shop Name'}
                      </FieldLabel>
                      <TextInput
                        icon={Building2}
                        value={form.organisation_name}
                        onChange={set('organisation_name')}
                        placeholder={
                          form.role === 'supplier'
                            ? 'e.g. Kilimo Bora Fertilizers Ltd'
                            : form.role === 'cooperative'
                            ? 'e.g. Mbinga Central Cooperative'
                            : 'e.g. Agri-Inputs Store Songea'
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel required>Region</FieldLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <select
                          value={form.region}
                          onChange={setRegion}
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
                        >
                          <option value="">Select region…</option>
                          {REGION_LIST.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <FieldLabel required>District</FieldLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <select
                          value={form.district}
                          onChange={set('district')}
                          disabled={!form.region}
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          <option value="">{form.region ? 'Select district…' : 'Select region first'}</option>
                          {(TANZANIA_REGIONS[form.region] || []).map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceedStep2 || loading}
                  className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting…' : 'Submit Registration Request'}
                </button>

                <p className="text-center text-xs text-gray-500">
                  Fields marked <span className="text-red-500 font-bold">*</span> are required.{' '}
                  Already registered?{' '}
                  <Link to="/login" className="text-green-700 font-semibold hover:underline">Sign in</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
