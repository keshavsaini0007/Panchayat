import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { login } from "@/services/authService";
import useAuthStore from "@/store/authStore";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/FloatingLabelInput";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";


const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

function Login() {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await login(data);
      loginSuccess(res.data, res.data.token);
      toast({ title: "Welcome back!", description: "Signed in successfully." });
      const role = res.data.role;
      if (role === "admin" || role === "gram_pradhan") navigate("/admin");
      else if (role === "ward_member") navigate("/ward-dashboard");
      else navigate("/");
    } catch (err) {
      toast({
        title: "Login failed",
        description: err.response?.data?.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
              <LogIn className="mx-auto text-white/80" size={36} />
              <h2
                className="text-2xl font-semibold leading-none tracking-tight"
                style={{
                  background: "linear-gradient(45deg, #000000 4%, #fff, #000)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Welcome Back
              </h2>
              <p className="text-sm text-zinc-400">
                Sign in to your Panchayat account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4  w-[84%]">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FloatingLabelInput
                        label="Email"
                        type="email"
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
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white text-black hover:bg-white/90 border-0"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-zinc-400 mt-6">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default Login;
