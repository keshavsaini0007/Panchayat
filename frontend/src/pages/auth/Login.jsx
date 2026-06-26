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
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <LogIn className="mx-auto text-primary" size={36} />
          <CardTitle className="text-2xl mt-2">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Panchayat account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full animate-breathe">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-primary hover:text-accent font-medium transition-colors"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

export default Login;
