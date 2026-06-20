import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { register as registerUser, sendOtp, verifyOtp } from '../../services/authService';
import useAuthStore from '../../store/authStore';
import OtpModal from '../../components/auth/OtpModal';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['citizen', 'ward_member', 'gram_pradhan']),
    village: z.string().min(1, 'Village is required'),
    ward: z.string().min(1, 'Ward is required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function Register() {
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const navigate = useNavigate();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({ resolver: zodResolver(schema) });

  const handleSendOtp = async () => {
    const data = getValues();
    setFormData(data);
    setSendingOtp(true);
    try {
      await sendOtp(data.email);
      setShowOtpModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    await sendOtp(formData.email);
  };

  const handleVerifyOtp = async (otp) => {
    await verifyOtp(formData.email, otp);
    setShowOtpModal(false);
    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = formData;
      const res = await registerUser(payload);
      loginSuccess(res.data, res.data.token);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      setShowOtpModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setShowOtpModal(false);
  };

  const handleCloseModal = () => {
    setShowOtpModal(false);
  };

  const isFormDisabled = sendingOtp || submitting;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <UserPlus className="mx-auto text-green-600" size={36} />
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Create Account</h1>
          <p className="text-gray-500 text-sm">Join your Panchayat community</p>
        </div>

        <form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              {...register('name')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Your name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              {...register('phone')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="10-digit phone number"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              {...register('password')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Min 6 characters"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              {...register('confirmPassword')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Repeat password"
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              {...register('role')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="citizen">Citizen</option>
              <option value="ward_member">Ward Member</option>
              <option value="gram_pradhan">Gram Pradhan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
            <input
              type="text"
              {...register('village')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Your village"
            />
            {errors.village && <p className="text-red-500 text-xs mt-1">{errors.village.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
            <input
              type="text"
              {...register('ward')}
              disabled={isFormDisabled}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Ward number or name"
            />
            {errors.ward && <p className="text-red-500 text-xs mt-1">{errors.ward.message}</p>}
          </div>

          <button
            type="submit"
            disabled={sendingOtp || submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            {sendingOtp ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sending OTP...
              </>
            ) : submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <Mail size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 hover:underline font-medium">Sign In</Link>
        </p>
      </div>

      {showOtpModal && formData && (
        <OtpModal
          email={formData.email}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onChangeEmail={handleChangeEmail}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default Register;
