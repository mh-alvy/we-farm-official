import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, LogIn, Phone, ShieldCheck, KeyRound, ArrowRight, RefreshCw, CheckCircle2, MessageSquare, PhoneCall } from 'lucide-react';
import { findInvestorByPhone, normalizePhone, setPhoneSession, subscribeToAuthSession } from '../lib/authSession';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unregisteredNotice, setUnregisteredNotice] = useState(false);

  // Phone OTP States
  const [phoneInput, setPhoneInput] = useState('');
  const [otpStep, setOtpStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  const [otpInput, setOtpInput] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [fallbackOtpInfo, setFallbackOtpInfo] = useState<{ code: string; notice: string } | null>(null);
  const [pendingInvestorProfile, setPendingInvestorProfile] = useState<any>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession((state) => {
      if (state.uid) {
        if (state.role === 'admin' || state.role === 'super_admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/profile', { replace: true });
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setUnregisteredNotice(false);
    setFallbackOtpInfo(null);

    const cleanPhone = normalizePhone(phoneInput);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর প্রদান করুন (যেমন: 017XXXXXXXX)।');
      return;
    }

    setLoading(true);
    try {
      // 1. STRICT CHECK: Verify if this phone number is registered as an investor in Firestore
      const investorProfile = await findInvestorByPhone(cleanPhone);
      if (!investorProfile) {
        setUnregisteredNotice(true);
        setLoading(false);
        return;
      }

      setPendingInvestorProfile(investorProfile);

      // 2. Send OTP via backend Alpha Net SMS Gateway
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('সার্ভার থেকে সঠিক উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'OTP পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }

      setPhoneInput(cleanPhone);
      setOtpStep('enter_otp');
      setResendTimer(60);
      setSuccessMsg(data.message || `আপনার ${cleanPhone} নম্বরে ৬ সংখ্যার OTP পাঠানো হয়েছে।`);

      if (data.fallbackOtp) {
        setFallbackOtpInfo({
          code: data.fallbackOtp,
          notice: data.smsNotice || 'SMS গ্যাটওয়ে সীমাবদ্ধতার কারণে আপনার OTP নিচে দেখানো হলো:'
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP পাঠাতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedOtp = otpInput.trim();
    if (trimmedOtp.length !== 6) {
      setError('অনুগ্রহ করে ৬ সংখ্যার OTP কোডটি সঠিকভাবে লিখুন।');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, otp: trimmedOtp })
      });
      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('সার্ভার থেকে সঠিক উত্তর পাওয়া যায়নি।');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ভুল OTP কোড দেওয়া হয়েছে।');
      }

      if (pendingInvestorProfile) {
        setPhoneSession(pendingInvestorProfile);
        if (pendingInvestorProfile.role === 'admin' || pendingInvestorProfile.role === 'super_admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/profile', { replace: true });
        }
      } else {
        const profile = await findInvestorByPhone(phoneInput);
        if (!profile) {
          setUnregisteredNotice(true);
          setOtpStep('enter_phone');
          return;
        }
        setPhoneSession(profile);
        navigate('/profile', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP যাচাই করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-4">
            <Tractor className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            ইনভেস্টর প্রোফাইল লগইন
          </h1>
          <p className="text-sm text-gray-500">
            নিবন্ধিত মোবাইল নম্বর এবং OTP দিয়ে আপনার ইনভেস্টর প্রোফাইলে প্রবেশ করুন
          </p>
        </div>

        {/* Unregistered Investor Notice */}
        {unregisteredNotice ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-4 mb-6">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-amber-900">আপনি কোনো নিবন্ধিত ইনভেস্টর নন</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                আপনার প্রদান করা মোবাইল নম্বরটি We Farm ইনভেস্টর তালিকায় তালিকাভুক্ত নেই। ইনভেস্টর হিসেবে যুক্ত হতে অনুগ্রহ করে We Farm কর্তৃপক্ষের সাথে যোগাযোগ করুন।
              </p>
            </div>
            
            <div className="pt-2 flex flex-col gap-2.5">
              <a
                href="tel:+8801700000000"
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
              >
                <PhoneCall className="h-4 w-4" />
                <span>সরাসরি কল করুন (Direct Call)</span>
              </a>
              <a
                href="https://wa.me/8801700000000?text=Assalamu%20Alaikum,%20I%20want%20to%20become%20a%20registered%20investor%20at%20We%20Farm."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>হোয়াটসঅ্যাপে মেসেজ দিন (WhatsApp)</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                setUnregisteredNotice(false);
                setPhoneInput('');
                setOtpStep('enter_phone');
              }}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 underline pt-1 cursor-pointer"
            >
              অন্য নম্বর দিয়ে চেষ্টা করুন
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-medium mb-6 flex items-start space-x-2">
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-xl text-xs font-medium mb-6 flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              {otpStep === 'enter_phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      নিবন্ধিত মোবাইল নম্বর (Registered Phone)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="017XXXXXXXX"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all font-bold text-gray-900 tracking-wide"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      এডমিন প্যানেলে তালিকাভুক্ত আপনার মোবাইল নম্বরটি লিখুন।
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>OTP কোড পাঠান</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Phone className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">মোবাইল নম্বর</p>
                        <p className="text-sm font-bold text-gray-900">{phoneInput}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('enter_phone');
                        setOtpInput('');
                        setError(null);
                        setSuccessMsg(null);
                        setFallbackOtpInfo(null);
                      }}
                      className="text-xs font-bold text-green-600 hover:underline cursor-pointer"
                    >
                      পরিবর্তন করুন
                    </button>
                  </div>

                  {fallbackOtpInfo && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                      <p className="text-[11px] text-amber-800 font-medium">{fallbackOtpInfo.notice}</p>
                      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-amber-200">
                        <span className="font-mono text-lg font-extrabold tracking-widest text-amber-900">
                          {fallbackOtpInfo.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOtpInput(fallbackOtpInfo.code)}
                          className="text-xs font-bold bg-amber-600 text-white px-3 py-1 rounded-md hover:bg-amber-700 transition-colors cursor-pointer"
                        >
                          কোড বসিয়ে নিন
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ৬ সংখ্যার OTP কোড দিন
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="• • • • • •"
                        required
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all font-mono text-xl font-extrabold tracking-[0.4em] text-center text-gray-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpInput.length !== 6}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <LogIn className="h-5 w-5" />
                        <span>যাচাই করুন ও লগইন করুন</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center pt-2">
                    {resendTimer > 0 ? (
                      <span className="text-xs text-gray-400 font-medium">
                        পুনরায় OTP পাঠান ({resendTimer} সেকেন্ড পর)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading}
                        className="inline-flex items-center space-x-1.5 text-xs font-bold text-green-600 hover:text-green-700 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>পুনরায় OTP পাঠান (Resend OTP)</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
