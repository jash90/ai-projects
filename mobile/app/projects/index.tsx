import { FlatList, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useListProjects, useCreateProject } from '@/api/generated/projects/projects';
import { useState } from 'react';
import { TextInput, Alert } from 'react-native';

export default function ProjectsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useListProjects({ query: { params: { query: { limit: 50 } } } });
  const createProject = useCreateProject();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const projects = data?.data?.projects ?? [];

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createProject.mutateAsync({ data: { name: name.trim() } });
      setName('');
      setShowCreate(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create project');
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No projects yet. Create one!</Text>
          }
          ListHeaderComponent={
            showCreate ? (
              <View style={styles.createRow}>
                <TextInput style={styles.createInput} placeholder="Project name" value={name}
                  onChangeText={setName} autoFocus onSubmitEditing={handleCreate} />
                <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                  <Text style={styles.createBtnText}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Text style={{ color: '#999', marginLeft: 8 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
                <Text style={styles.fabText}>+ New Project</Text>
              </TouchableOpacity>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/projects/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.cardDate}>
                {new Date(item.updated_at || item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },
  fab: { backgroundColor: '#007AFF', margin: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  createRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  createInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, fontSize: 14 },
  createBtn: { backgroundColor: '#007AFF', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, marginLeft: 8 },
  createBtnText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 8, padding: 16, borderRadius: 8, elevation: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#999' },
});
