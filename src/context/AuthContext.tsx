import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, AuthCredentials } from '../types/employee';
import { authService } from '../services/authService';

interface AuthContextType {
  user: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check initial auth state
    const current = authService.getCurrentEmployee();
    setUser(current);
    setIsLoading(false);
  }, []);

  const login = async (credentials: AuthCredentials) => {
    setIsLoading(true);
    const result = await authService.login(credentials);
    setIsLoading(false);
    if (result.success && result.employee) {
      setUser(result.employee);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.logout();
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

