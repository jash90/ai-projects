import { FlatList, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAgents } from '../../src/api/hooks';

export default function AgentPickerScreen() {
  const router = useRouter();
  const { data, isLoading } = useAgents();
  const agents = data?.agents ?? [];

  // Try to get projectId from params if navigating from project detail
  // expo-router passes search params via useLocalSearchParams

  if (isLoading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select an Agent</Text>
      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No agents available</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              // Navigate back or to chat — handled by caller
              router.back();
            }}
          >
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardModel}>{item.provider} / {item.model}</Text>
            {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  card: { padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardModel: { fontSize: 13, color: '#007AFF', marginTop: 2 },
  cardDesc: { fontSize: 14, color: '#666', marginTop: 4 },
});
