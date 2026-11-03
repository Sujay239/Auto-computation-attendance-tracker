import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your Employee ID or Work Email.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login({
      employeeIdOrEmail: identifier.trim(),
      password: password.trim(),
      rememberMe,
    });
    setIsSubmitting(false);

    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Safe Area Inset with Pure White Background */}
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Centered Login Form Wrapper */}
          <View className="w-full">
            {/* Corporate Header with Logo */}
            <View className="items-center mb-5">
              <Image
                source={require('../../../assets/images/company-logo.png')}
                style={{ width: 74, height: 88, marginBottom: 8 }}
                resizeMode="contain"
              />

              <Text className="text-2xl font-black text-slate-900 tracking-tight text-center">
                Auto Computation
              </Text>

              <View className="flex-row items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <Text className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Employee HRMS Portal
                </Text>
              </View>
            </View>

            {/* Credentials Card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderWidth: 1,
                borderRadius: 20,
                padding: 20,
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
              className="mb-4"
            >
              <Text className="text-base font-bold text-slate-900 mb-1">
                Employee Sign In
              </Text>
              <Text className="text-xs text-slate-500 mb-4">
                Enter your authorized company credentials.
              </Text>

              {error && (
                <View className="flex-row items-center bg-rose-50 border border-rose-200 p-3 rounded-xl mb-4">
                  <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text className="text-xs text-rose-700 font-semibold flex-1">
                    {error}
                  </Text>
                </View>
              )}

              <Input
                label="Employee ID / Work Email"
                placeholder="e.g. EMP-024 or sujay.verma@company.com"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (error) setError(null);
                }}
                iconName="mail-outline"
                autoCapitalize="none"
                keyboardType="email-address"
                containerClassName="mb-3"
              />

              <Input
                label="Password"
                placeholder="Enter your account password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                isPassword
                iconName="lock-closed-outline"
                containerClassName="mb-3"
              />

              {/* Remember Me & Security Status */}
              <View className="flex-row items-center justify-between mb-5 mt-1">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setRememberMe(!rememberMe)}
                  className="flex-row items-center gap-2.5 py-1"
                >
                  <View
                    style={{
                      backgroundColor: rememberMe ? '#2563EB' : '#FFFFFF',
                      borderColor: rememberMe ? '#2563EB' : '#CBD5E1',
                      borderWidth: 1.5,
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {rememberMe && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                  </View>
                  <Text className="text-xs font-semibold text-slate-700">
                    Remember my credentials
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center gap-1">
                  <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                  <Text className="text-[11px] text-slate-500 font-medium">Secured</Text>
                </View>
              </View>

              <Button
                label={isSubmitting ? 'Verifying Credentials...' : 'Sign In to Portal'}
                size="lg"
                isLoading={isSubmitting}
                onPress={handleLogin}
                icon={<Ionicons name="log-in-outline" size={20} color="#ffffff" />}
              />
            </View>

            {/* Security Notice */}
            <View className="items-center pt-2">
              <View className="flex-row items-center gap-1 mb-0.5">
                <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                <Text className="text-[10px] font-semibold text-slate-500">
                  Auto Computation HR Management
                </Text>
              </View>
              <Text className="text-[10px] text-slate-400 text-center">
                Authorized employee access only. All sessions are logged & audited.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
