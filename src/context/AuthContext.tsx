import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, AuthCredentials } from '../types/employee';
import { authService } from '../services/authService';
import { pushNotificationService } from '../services/pushNotificationService';

interface AuthContextType {
  user: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<{ success: boolean; role?: string; employee?: Employee; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (employee: Employee) => void;
  updateAvatar: (base64Uri: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  updateUser: () => {},
  updateAvatar: async () => ({ success: false }),
  changePassword: async () => ({ success: false }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check and restore persistent auth state from AsyncStorage
    const restoreSession = async () => {
      try {
        const session = await authService.initSession();
        if (session.token && session.employee) {
          setUser(session.employee);
          setToken(session.token);
        }
      } catch (e) {
        console.warn('[AuthContext] Session restore error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Sync device push token with backend whenever user is authenticated
  useEffect(() => {
    if (user?.id) {
      pushNotificationService
        .syncDeviceTokenWithBackend(user.id, user.role || 'EMPLOYEE')
        .catch((err) => console.log('[PushNotification] Sync skipped/failed:', err?.message));
    }
  }, [user?.id, user?.role]);

  const login = async (credentials: AuthCredentials) => {
    setIsLoading(true);
    const result = await authService.login(credentials);
    setIsLoading(false);
    if (result.success && result.employee) {
      setUser(result.employee);
      setToken(result.token || authService.getToken());
      return { 
        success: true, 
        role: result.employee.role || 'EMPLOYEE',
        employee: result.employee 
      };
    }
    return { success: false, error: result.error };
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.logout();
    setUser(null);
    setToken(null);
    setIsLoading(false);
  };

  const updateUser = (updatedUser: Employee) => {
    setUser(updatedUser);
  };

  const updateAvatar = async (base64Uri: string) => {
    const res = await authService.updateAvatar(base64Uri);
    if (res.success && res.employee) {
      setUser(res.employee);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    return await authService.changePassword(oldPassword, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        updateAvatar,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

