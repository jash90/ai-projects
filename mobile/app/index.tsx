import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthVerify } from '@/api/generated/auth/auth';

export default function HomeScreen() {
  const { data, isLoading } = useAuthVerify();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (data?.data?.valid) {
    return <Redirect href="/projects" />;
  }

  return <Redirect href="/auth/login" />;
}
