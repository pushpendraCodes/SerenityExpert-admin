import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sendOtp, verifyOtp, resetOtp } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { normalizePhone } from "@/lib/utils";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, otpSent, devOtp, error } = useAppSelector((s) => s.auth);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (devOtp) setOtp(devOtp);
  }, [devOtp]);

  const onSendOtp = (e: FormEvent) => {
    e.preventDefault();
    dispatch(sendOtp(normalizePhone(phone)));
  };

  const onVerify = (e: FormEvent) => {
    e.preventDefault();
    dispatch(verifyOtp({ phone: normalizePhone(phone), otp }));
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-linear-to-br from-primary to-primary-dark p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">SerenityExpert</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Super Admin Panel</h1>
          <p className="mt-4 max-w-md text-white/80">
            Manage users, experts, live calls, payouts, community moderation, and platform
            content — all in one place.
          </p>
        </div>
        <p className="text-sm text-white/60">Authorized personnel only.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="card w-full max-w-md p-8">
          <h2 className="text-2xl font-bold text-ink">Admin sign in</h2>
          <p className="mt-1 text-sm text-muted">
            {otpSent ? "Enter the OTP sent to your phone" : "Sign in with your admin phone number"}
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
          )}
          {devOtp && (
            <div className="mt-4 rounded-lg bg-mint px-3 py-2 text-sm text-mint-text">
              Dev OTP: <strong>{devOtp}</strong>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={onSendOtp} className="mt-6 space-y-4">
              <Input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={onVerify} className="mt-6 space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Verify & sign in
              </Button>
              <button
                type="button"
                onClick={() => dispatch(resetOtp())}
                className="w-full text-sm font-medium text-primary hover:underline"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
