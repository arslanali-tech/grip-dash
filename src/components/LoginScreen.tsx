import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, ArrowRightIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function LoginScreen() {
  const { loginWithEmailPassword, sendPasswordReset, loginWithOtp, status, error } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'forgotPassword' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const isLoading = status === 'loading';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginWithEmailPassword(email, password);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendPasswordReset(email);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginWithOtp(email);
  };

  const [customBgImage, setCustomBgImage] = useState<string | null>(
    localStorage.getItem('login-bg-image')
  );
  const defaultBgUrl = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2070&auto=format&fit=crop';

  useEffect(() => {
    const handleBgUpdate = () => {
      setCustomBgImage(localStorage.getItem('login-bg-image'));
    };

    window.addEventListener('login-bg-updated', handleBgUpdate);
    return () => window.removeEventListener('login-bg-updated', handleBgUpdate);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center p-8">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${customBgImage || defaultBgUrl})`,
        }}
      />
      
      {/* Subtle overlay for better contrast */}
      <div className="absolute inset-0 bg-black/20" />
      
        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <img
            src="https://c.animaapp.com/mjhelv55slzlFZ/img/brandmark-design.png"
            alt="GRIP Logo"
            className="h-12 w-auto mx-auto dark:invert"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Login / Forgot / OTP Forms */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-background border-border focus-visible:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" strokeWidth={1.5} />
                    ) : (
                      <EyeIcon className="h-5 w-5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setMode('forgotPassword')}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRightIcon className="h-5 w-5" strokeWidth={2} />
                </span>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Or
              <button
                type="button"
                onClick={() => setMode('otp')}
                className="ml-1 font-medium text-primary hover:text-primary/80"
              >
                sign in via OTP / magic link
              </button>
            </div>
          </form>
        )}

        {mode === 'forgotPassword' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-foreground font-medium">
                  Enter your email to reset password
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Sending reset link...' : 'Send reset link'}
            </Button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-sm text-primary hover:text-primary/80"
            >
              Back to login
            </button>
          </form>
        )}

        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-email" className="text-foreground font-medium">
                  Sign in with a magic link
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Sending magic link...' : 'Send magic link'}
            </Button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-sm text-primary hover:text-primary/80"
            >
              Back to login
            </button>
          </form>
        )}

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button
            type="button"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </button>
        </p>
        </div>
      </div>
  );
}
