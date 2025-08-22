import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Email whitelist - only these emails can create accounts
const WHITELISTED_EMAILS = [
  'john.barr@mainecc.edu',
  // Add more whitelisted emails here
];

const WHITELISTED_DOMAINS = [
  'mainecc.edu',
  // Add more whitelisted domains here
];

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

export const useAuth = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const signUp = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Validate email is whitelisted
      if (!isEmailWhitelisted(email)) {
        throw new Error('This email domain is not authorized. Only @mainecc.edu emails are allowed.');
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
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
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Account Created! 🔐",
        description: "Please check your email for a verification link before signing in.",
      });
    },
    onError: (error) => {
      console.warn('🚨 Failed sign-up attempt:', error.message);
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signIn = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Validate email is whitelisted
      if (!isEmailWhitelisted(email)) {
        throw new Error('This email is not authorized to access the system. Please contact an administrator.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      
      if (error) {
        // Log failed attempt for security monitoring
        console.warn('🚨 Failed sign-in attempt:', email, error.message);
        
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for a verification link.');
        }
        
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      console.log('🔐 User signed in:', data.user?.email);
      toast({
        title: "Welcome Back! 🎉",
        description: "Successfully signed in to YCCC Nursing Inventory",
      });
    },
    onError: (error) => {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      console.log('🔓 User signed out');
      toast({
        title: "Signed Out",
        description: "You have been securely signed out",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendVerification = useMutation({
    mutationFn: async (email: string) => {
      if (!isEmailWhitelisted(email)) {
        throw new Error('This email is not authorized to access the system.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent! 📧",
        description: "Please check your inbox for the verification link.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    resendVerification,
    isAuthenticated: !!user && !!user.email_confirmed_at,
    isEmailWhitelisted,
    validatePasswordStrength,
  };
};