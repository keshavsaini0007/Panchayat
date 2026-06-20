import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Check, AlertCircle, X, Clock, ArrowLeft } from 'lucide-react';

const RESEND_COOLDOWN = 60;

function OtpModal({ email, onVerify, onResend, onChangeEmail, onClose }) {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    setError('');
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    const newOtp = Array(6).fill('');
    for (let i = 0; i < paste.length; i++) {
      newOtp[i] = paste[i];
    }
    setOtp(newOtp);
    setError('');
    const focusIndex = Math.min(paste.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await onResend();
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative animate-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Email Verification</h2>
          <p className="text-gray-500 text-sm mt-2">
            Enter the 6-digit code sent to
          </p>
          <p className="text-gray-700 font-medium mt-1">{email}</p>
        </div>

        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                error
                  ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                  : digit
                  ? 'border-green-500 focus:ring-green-400'
                  : 'border-gray-300 focus:ring-green-400 focus:border-green-500'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4 justify-center">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify OTP'
          )}
        </button>

        <div className="flex items-center justify-between mt-5 text-sm">
          <button
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition"
          >
            {resending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              <>
                <Clock size={14} />
                Resend in {countdown}s
              </>
            ) : (
              'Resend OTP'
            )}
          </button>

          <button
            onClick={onChangeEmail}
            className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 transition"
          >
            <ArrowLeft size={14} />
            Change email
          </button>
        </div>
      </div>
    </div>
  );
}

export default OtpModal;
