import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetProject, useDeleteProject } from '@/api/generated/projects/projects';
import { useGetProjectConversations } from '@/api/generated/conversations/conversations';
import { Alert } from 'react-native';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: projectData, isLoading } = useGetProject(id);
  const { data: convData } = useGetProjectConversations(id);
  const deleteProject = useDeleteProject();

  const project = (projectData as any)?.data?.data;
  const conversations = (convData as any)?.data?.data?.conversations;
  const convCount = convData?.conversations?.length ?? 0;

  const handleDelete = () => {
    Alert.alert('Delete Project', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteProject.mutateAsync({ id });
          router.back();
        },
      },
    ]);
  };

  if (isLoading) return <ActivityIndicator size="large" style={styles.loader} />;
  if (!project) return <Text style={styles.error}>Project not found</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{project.name}</Text>
      {project.description ? <Text style={styles.desc}>{project.description}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conversations {conversations ? `(${conversations.length})` : ''}</Text>
        {(conversations ?? []).map((conv: any) => (
          <TouchableOpacity key={conv.id} style={styles.convCard}
            onPress={() => router.push(`/chat/${id}/${conv.agent_id}`)}>
            <Text style={styles.convAgent}>Agent: {conv.agent_id}</Text>
            <Text style={styles.convMsgs}>{conv.messages?.length ?? 0} messages</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/chat?projectId=${id}`)}>
          <Text style={styles.chatBtnText}>💬 Start Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Project</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  loader: { marginTop: 40 },
  error: { textAlign: 'center', marginTop: 40, color: '#999' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  desc: { fontSize: 15, color: '#666', marginBottom: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  convCard: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 },
  convAgent: { fontSize: 14, fontWeight: '500' },
  convMsgs: { fontSize: 12, color: '#999' },
  actions: { marginTop: 24, gap: 12 },
  chatBtn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  chatBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteBtn: { padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ff3b30' },
  deleteBtnText: { color: '#ff3b30', fontSize: 16 },
});
