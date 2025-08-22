import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Shield, Mail, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ isValid: boolean; errors: string[] }>({ isValid: false, errors: [] });

  const { signIn, signUp, resendVerification, isEmailWhitelisted, validatePasswordStrength } = useAuth();

  // Real-time password validation
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (mode === 'signup' && validatePasswordStrength) {
      setPasswordStrength(validatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'signin') {
        await signIn.mutateAsync({ email, password });
        onOpenChange(false);
      } else if (mode === 'signup') {
        // Additional client-side validation
        if (password !== confirmPassword) {
          return;
        }

        if (validatePasswordStrength && !validatePasswordStrength(password).isValid) {
          return;
        }

        await signUp.mutateAsync({ email, password });
        setMode('verify');
      } else if (mode === 'verify') {
        await resendVerification.mutateAsync(email);
      }
    } catch (error) {
      // Error handling is done by the useAuth hook via toast
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPasswordStrength({ isValid: false, errors: [] });
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'verify') => {
    setMode(newMode);
    resetForm();
  };

  const getPasswordStrengthColor = () => {
    if (!password) return 'bg-gray-200';
    if (passwordStrength.errors.length > 3) return 'bg-red-500';
    if (passwordStrength.errors.length > 1) return 'bg-yellow-500';
    if (passwordStrength.errors.length === 1) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (!password) return 'Enter password';
    if (passwordStrength.errors.length > 3) return 'Weak';
    if (passwordStrength.errors.length > 1) return 'Fair';
    if (passwordStrength.errors.length === 1) return 'Good';
    return 'Strong';
  };

  const isLoading = signIn.isPending || signUp.isPending || resendVerification.isPending;
  const emailWhitelisted = isEmailWhitelisted ? isEmailWhitelisted(email) : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"sm:max-w-md\">
        <DialogHeader>
          <DialogTitle className=\"flex items-center gap-2\">
            <Shield className=\"h-5 w-5 text-blue-600\" />
            {mode === 'signin' && 'Secure Sign In'}
            {mode === 'signup' && 'Create Secure Account'}
            {mode === 'verify' && 'Email Verification'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin' && 'Sign in to access the YCCC Nursing Inventory system'}
            {mode === 'signup' && 'Create a new account with enhanced security'}
            {mode === 'verify' && 'Verify your email address to complete registration'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className=\"space-y-4\">
          {mode !== 'verify' && (
            <div className=\"space-y-2\">
              <Label htmlFor=\"email\" className=\"flex items-center gap-2\">
                <Mail className=\"h-4 w-4\" />
                Email Address
              </Label>
              <Input
                id=\"email\"
                type=\"email\"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=\"your.email@mainecc.edu\"
                required
                className={!emailWhitelisted && email ? 'border-red-500' : ''}
              />
              {email && !emailWhitelisted && (
                <p className=\"text-sm text-red-600 flex items-center gap-1\">
                  <XCircle className=\"h-4 w-4\" />
                  Only @mainecc.edu emails are authorized
                </p>
              )}
              {email && emailWhitelisted && (
                <p className=\"text-sm text-green-600 flex items-center gap-1\">
                  <CheckCircle className=\"h-4 w-4\" />
                  Authorized email domain
                </p>
              )}
            </div>
          )}

          {mode !== 'verify' && (
            <div className=\"space-y-2\">
              <Label htmlFor=\"password\" className=\"flex items-center gap-2\">
                <Lock className=\"h-4 w-4\" />
                Password
              </Label>
              <div className=\"relative\">
                <Input
                  id=\"password\"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a strong password (12+ characters)' : 'Enter your password'}
                  required
                  className=\"pr-10\"
                />
                <Button
                  type=\"button\"
                  variant=\"ghost\"
                  size=\"sm\"
                  className=\"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent\"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className=\"h-4 w-4\" /> : <Eye className=\"h-4 w-4\" />}
                </Button>
              </div>
              
              {mode === 'signup' && password && (
                <div className=\"space-y-2\">
                  <div className=\"flex items-center justify-between text-sm\">
                    <span>Password Strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className=\"w-full bg-gray-200 rounded-full h-2\">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${Math.max(10, (4 - passwordStrength.errors.length) * 25)}%` }}
                    />
                  </div>
                  {passwordStrength.errors.length > 0 && (
                    <div className=\"text-sm text-red-600 space-y-1\">
                      {passwordStrength.errors.slice(0, 2).map((error, index) => (
                        <p key={index} className=\"flex items-center gap-1\">
                          <XCircle className=\"h-3 w-3\" />
                          {error}
                        </p>
                      ))}
                      {passwordStrength.errors.length > 2 && (
                        <p className=\"text-xs text-gray-600\">+{passwordStrength.errors.length - 2} more requirements</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className=\"space-y-2\">
              <Label htmlFor=\"confirmPassword\">Confirm Password</Label>
              <div className=\"relative\">
                <Input
                  id=\"confirmPassword\"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=\"Confirm your password\"
                  required
                  className=\"pr-10\"
                />
                <Button
                  type=\"button\"
                  variant=\"ghost\"
                  size=\"sm\"
                  className=\"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent\"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className=\"h-4 w-4\" /> : <Eye className=\"h-4 w-4\" />}
                </Button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className=\"text-sm text-red-600 flex items-center gap-1\">
                  <XCircle className=\"h-4 w-4\" />
                  Passwords do not match
                </p>
              )}
            </div>
          )}

          {mode === 'verify' && (
            <div className=\"text-center space-y-4\">
              <div className=\"mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center\">
                <Mail className=\"h-8 w-8 text-blue-600\" />
              </div>
              <div>
                <h3 className=\"font-semibold\">Check Your Email</h3>
                <p className=\"text-sm text-gray-600 mt-1\">
                  We sent a verification link to <strong>{email}</strong>
                </p>
                <p className=\"text-xs text-gray-500 mt-2\">
                  Click the link in your email to verify your account, then return here to sign in.
                </p>
              </div>
            </div>
          )}

          <div className=\"flex flex-col gap-2\">
            <Button 
              type=\"submit\" 
              disabled={isLoading || (email && !emailWhitelisted)}
              className=\"w-full\"
            >
              {isLoading ? 'Processing...' : 
               mode === 'signin' ? 'Sign In Securely' :
               mode === 'signup' ? 'Create Secure Account' :
               'Resend Verification Email'}
            </Button>
            
            {mode === 'signin' && (
              <Button type=\"button\" variant=\"outline\" onClick={() => switchMode('signup')}>
                Create New Account
              </Button>
            )}
            
            {mode === 'signup' && (
              <Button type=\"button\" variant=\"outline\" onClick={() => switchMode('signin')}>
                Already have an account? Sign In
              </Button>
            )}
            
            {mode === 'verify' && (
              <Button type=\"button\" variant=\"outline\" onClick={() => switchMode('signin')}>
                Back to Sign In
              </Button>
            )}
          </div>
        </form>

        <div className=\"text-xs text-gray-500 text-center space-y-1\">
          <p className=\"flex items-center justify-center gap-1\">
            <Shield className=\"h-3 w-3\" />
            Secured with enterprise-grade encryption
          </p>
          <p>Only authorized @mainecc.edu emails can access this system</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};