import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: 'AI Projects', headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: 'Create Account', headerShown: false }} />
        <Stack.Screen name="projects/index" options={{ title: 'Projects' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Project' }} />
        <Stack.Screen name="chat/index" options={{ title: 'Choose Agent' }} />
        <Stack.Screen name="chat/[projectId]/[agentId]" options={{ title: 'Chat' }} />
        <Stack.Screen name="agents/index" options={{ title: 'Agents' }} />
        <Stack.Screen name="agents/[id]" options={{ title: 'Agent' }} />
      </Stack>
    </QueryProvider>
  );
}
