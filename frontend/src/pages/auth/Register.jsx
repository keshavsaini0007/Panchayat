import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    role: z.enum(["citizen", "ward_member", "gram_pradhan"]),
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

  const form = useForm({
    resolver: zodResolver(formSchema),
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
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto text-primary" size={36} />
          <CardTitle className="text-2xl mt-2">Create Account</CardTitle>
          <CardDescription>Join your Panchayat community</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSendOtp)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Your name"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="10-digit phone number"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min 6 characters"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat password"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isFormDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="citizen">Citizen</SelectItem>
                          <SelectItem value="ward_member">Ward Member</SelectItem>
                          <SelectItem value="gram_pradhan">Gram Pradhan</SelectItem>
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
                    <FormLabel>Village</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Your village"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ward</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Ward number or name"
                        disabled={isFormDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={sendingOtp || submitting} className="w-full animate-breathe">
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:text-accent font-medium transition-colors"
            >
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>

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
