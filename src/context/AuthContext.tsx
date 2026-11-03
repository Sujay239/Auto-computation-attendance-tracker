import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, AuthCredentials } from '../types/employee';
import { authService } from '../services/authService';

interface AuthContextType {
  user: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (employee: Employee) => void;
  updateAvatar: (base64Uri: string) => Promise<{ success: boolean; error?: string }>;
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
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check initial auth state
    const current = authService.getCurrentEmployee();
    const currentToken = authService.getToken();
    setUser(current);
    setToken(currentToken);
    setIsLoading(false);
  }, []);

  const login = async (credentials: AuthCredentials) => {
    setIsLoading(true);
    const result = await authService.login(credentials);
    setIsLoading(false);
    if (result.success && result.employee) {
      setUser(result.employee);
      setToken(result.token || authService.getToken());
      return { success: true };
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

