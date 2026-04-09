import { FlatList, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useListAgents } from '@/api/generated/agents/agents';

export default function AgentPickerScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { data, isLoading } = useListAgents();
  const agents = (data as any)?.data?.data?.agents ?? [];

  if (isLoading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select an Agent</Text>
      <Text style={styles.subheading}>Choose an AI agent to chat with</Text>

      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No agents available</Text>}
        contentContainerStyle={agents.length === 0 ? { flex: 1, justifyContent: 'center' } : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (projectId) {
                router.replace(`/chat/${projectId}/${item.id}`);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.providerBadge}>
                <Text style={styles.providerText}>{item.provider}</Text>
              </View>
            </View>
            <Text style={styles.cardModel}>{item.model}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
            ) : null}
            <View style={styles.cardFooter}>
              <Text style={styles.cardTemp}>🌡 {item.temperature ?? 0.7}</Text>
              {item.max_tokens ? <Text style={styles.cardTokens}>📝 {item.max_tokens} tokens</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  heading: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 2 },
  subheading: { fontSize: 14, color: '#888', paddingHorizontal: 16, paddingBottom: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4, padding: 14,
    borderRadius: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardName: { fontSize: 16, fontWeight: '600', flex: 1 },
  providerBadge: { backgroundColor: '#E8F0FE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  providerText: { fontSize: 11, fontWeight: '600', color: '#1a73e8', textTransform: 'uppercase' },
  cardModel: { fontSize: 12, color: '#666', fontFamily: 'Menlo', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 12 },
  cardTemp: { fontSize: 11, color: '#999' },
  cardTokens: { fontSize: 11, color: '#999' },
});
