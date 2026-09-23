import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { register as registerUser, sendOtp, verifyOtp } from "@/services/authService";
import useAuthStore from "@/store/authStore";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/FloatingLabelInput";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OtpModal from "@/components/auth/OtpModal";

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["citizen"]),
    village: z.string().min(1, "Village is required"),
    ward: z.string().min(1, "Ward is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function Register() {
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const navigate = useNavigate();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  const resolver = useMemo(() => zodResolver(formSchema), []);
  const form = useForm({
    resolver,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "citizen",
      village: "",
      ward: "",
    },
  });

  const handleSendOtp = async () => {
    const data = form.getValues();
    setFormData(data);
    setSendingOtp(true);
    try {
      await sendOtp(data.email);
      setShowOtpModal(true);
    } catch (err) {
      toast({
        title: "Failed to send OTP",
        description: err.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
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
      // eslint-disable-next-line no-unused-vars
      const { confirmPassword, ...payload } = formData;
      const res = await registerUser(payload);
      loginSuccess(res.data, res.data.token);
      toast({ title: "Account created!", description: "Welcome to Panchayat." });
      navigate("/");
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
      setShowOtpModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => setShowOtpModal(false); 
  const handleCloseModal = () => setShowOtpModal(false);

  const isFormDisabled = sendingOtp || submitting;

  return (
    <PageTransition className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div
        className="relative w-full max-w-md rounded-xl p-[1px]"
        style={{
          background: "radial-gradient(circle 230px at 0% 0%, #ffffff, #0c0d0d)",
        }}
      >
        <div className="absolute w-[5px] aspect-square bg-white shadow-[0_0_10px_#ffffff] rounded-full z-[2] right-[10%] top-[10%] animate-moveDot" />

        <div
          className="relative z-[1] w-full h-full rounded-[9px] border border-[#202222] overflow-hidden"
          style={{
            background: "radial-gradient(circle 280px at 0% 0%, #444444, #0c0d0d)",
          }}
        >
          <div className="absolute w-[220px] h-[45px] rounded-full bg-[#c7c7c7] opacity-40 shadow-[0_0_50px_#fff] blur-[10px] origin-[10%] top-0 left-0 rotate-[40deg]" />

          <div className="absolute top-[10%] left-0 w-full h-[1px] bg-gradient-to-r from-[#888888] via-[#1d1f1f] to-transparent" />
          <div className="absolute bottom-[10%] left-0 w-full h-[1px] bg-[#2c2c2c]" />
          <div className="absolute top-0 left-[10%] w-[1px] h-full bg-gradient-to-b from-[#747474] via-[#222424] to-transparent" />
          <div className="absolute top-0 right-[10%] w-[1px] h-full bg-[#2c2c2c]" />

          <div className="p-6 relative z-10 flex flex-col items-center justify-center">
            <div className="text-center space-y-1.5 mb-6">
              <UserPlus className="mx-auto text-white/80" size={36} />
              <h2
                className="text-2xl font-semibold leading-none tracking-tight"
                style={{
                  background: "linear-gradient(45deg, #000000 4%, #fff, #000)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Create Account
              </h2>
              <p className="text-sm text-zinc-400">
                Join your Panchayat community
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSendOtp)} className="space-y-8  w-[84%]">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Full Name"
                        type="text"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Email"
                        type="email"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Phone"
                        type="text"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Password"
                        type="password"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Confirm Password"
                        type="password"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Role</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isFormDisabled}
                        >
                          <SelectTrigger className="bg-zinc-900/80 border-zinc-700 text-white data-[placeholder]:text-zinc-500 focus:ring-white/20">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectItem className="focus:bg-zinc-800 focus:text-white" value="citizen">Citizen</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="village"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Village"
                        type="text"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ward"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Ward"
                        type="text"
                        disabled={isFormDisabled}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={sendingOtp || submitting}
                  className="w-full bg-white text-black hover:bg-white/90 border-0"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-zinc-400 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
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
    </PageTransition>
  );
}

export default Register;
