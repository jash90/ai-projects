import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useVerifyAuth } from '../src/api/hooks';

export default function HomeScreen() {
  const { data, isLoading } = useVerifyAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (data?.valid) {
    return <Redirect href="/projects" />;
  }

  return <Redirect href="/auth/login" />;
}
