import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Check, AlertCircle, X, Clock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RESEND_COOLDOWN = 60;

function OtpModal({ email, onVerify, onResend, onChangeEmail, onClose }) {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    setError("");
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    const newOtp = Array(6).fill("");
    for (let i = 0; i < paste.length; i++) newOtp[i] = paste[i];
    setOtp(newOtp);
    setError("");
    inputRefs.current[Math.min(paste.length, 5)]?.focus();
  }, []);

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await onResend();
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="w-14 h-14 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2">
            <Check size={28} className="text-primary" />
          </div>
          <DialogTitle className="text-xl">Email Verification</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-4" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <Input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold ${
                error ? "border-destructive" : digit ? "border-primary" : ""
              }`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-destructive text-sm justify-center"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleVerify}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </Button>

        <div className="flex items-center justify-between mt-2">
          <Button
            variant="link"
            size="sm"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="text-primary"
          >
            {resending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              <>
                <Clock className="mr-1 h-3 w-3" />
                Resend in {countdown}s
              </>
            ) : (
              "Resend OTP"
            )}
          </Button>

          <Button
            variant="link"
            size="sm"
            onClick={onChangeEmail}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Change email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OtpModal;
