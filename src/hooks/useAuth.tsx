import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useMutation, useQuery } from '@tanstack/react-query';

// Email whitelist - only these emails can create accounts
const WHITELISTED_EMAILS = [
  'john.barr@mainecc.edu',
  // Add more whitelisted emails here
];

const WHITELISTED_DOMAINS = [
  'mainecc.edu',
  // Add more whitelisted domains here
];

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  isEmailWhitelisted: (email: string) => boolean;
  validatePasswordStrength: (password: string) => { isValid: boolean; errors: string[] };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if email is whitelisted
  const isEmailWhitelisted = (email: string): boolean => {
    const emailLower = email.toLowerCase();
    
    // Check exact email matches
    if (WHITELISTED_EMAILS.some(whitelisted => whitelisted.toLowerCase() === emailLower)) {
      return true;
    }
    
    // Check domain matches
    const domain = emailLower.split('@')[1];
    return WHITELISTED_DOMAINS.some(whitelistedDomain => domain === whitelistedDomain);
  };

  // Validate password strength
  const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check against common passwords
    const commonPasswords = [
      'password123', 'admin123456', '123456789012', 'qwerty123456',
      'password1234', 'administrator'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
      errors.push('Password contains common patterns - please choose a more unique password');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Log authentication events for security monitoring
        if (event === 'SIGNED_IN') {
          console.log('🔐 User signed in:', session?.user?.email);
          // Log to audit table in production
        } else if (event === 'SIGNED_OUT') {
          console.log('🔓 User signed out');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate email is whitelisted
      if (!isEmailWhitelisted(email)) {
        return {
          success: false,
          error: 'This email is not authorized to access the system. Please contact an administrator.'
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // Log failed attempt for security monitoring
        console.warn('🚨 Failed sign-in attempt:', email, error.message);
        
        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            error: 'Please verify your email address before signing in. Check your inbox for a verification link.'
          };
        }
        
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Sign-in error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  };

  // Sign up function with enhanced security
  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate email is whitelisted
      if (!isEmailWhitelisted(email)) {
        return {
          success: false,
          error: 'This email domain is not authorized. Only @mainecc.edu emails are allowed.'
        };
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. ')
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            email_verified: false,
            created_at: new Date().toISOString(),
          }
        }
      });

      if (error) {
        console.warn('🚨 Failed sign-up attempt:', email, error.message);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        error: 'Account created! Please check your email for a verification link before signing in.'
      };
    } catch (error) {
      console.error('Sign-up error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  };

  // Resend verification email
  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isEmailWhitelisted(email)) {
        return {
          success: false,
          error: 'This email is not authorized to access the system.'
        };
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        error: 'Verification email sent! Please check your inbox.'
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!user.email_confirmed_at,
    isLoading,
    signIn,
    signUp,
    signOut,
    resendVerification,
    isEmailWhitelisted,
    validatePasswordStrength,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for components that need auth
export default function useAuthHook() {
  return useAuth();
}