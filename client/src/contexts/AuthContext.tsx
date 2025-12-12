import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI, type User, type LoginRequest, type RegisterRequest, type ChangePasswordRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true for initial auth check

  // Check for stored user on initial load
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Verify token is still valid
          const currentUser = await authAPI.me();
          setUser(currentUser);
        } catch (error) {
          console.error('Auth check failed:', error);
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setIsLoading(false); // Auth check completed
    };

    void checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Detect device info
      const deviceName = getBrowserName();
      const deviceType = 'web';
      
      const credentials: LoginRequest = { 
        email, 
        password,
        device_name: deviceName,
        device_type: deviceType,
      };
      const response = await authAPI.login(credentials);
      
      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get browser name
  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Web Browser';
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    setIsLoading(true);
    try {
      const userData: RegisterRequest = { email, password, name };
      const response = await authAPI.register(userData);
      
      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    try {
      const passwordData: ChangePasswordRequest = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      await authAPI.changePassword(passwordData);
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authAPI.deleteAccount();
      // After successful deletion, log the user out
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Delete account failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Call API logout (optional, since we're removing token anyway)
    authAPI.logout().catch(console.error);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    changePassword,
    deleteAccount,
    isAuthenticated: !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
