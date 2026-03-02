import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    autoLogin,
    updateProfile,
    forgotPassword,
    clearError,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    autoLogin,
    updateProfile,
    forgotPassword,
    clearError,
  };
}
