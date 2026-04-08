import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChat } from '@/api/generated/chat/chat';
import { useGetConversation } from '@/api/generated/conversations/conversations';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatScreen() {
  const { projectId, agentId } = useLocalSearchParams<{ projectId: string; agentId: string }>();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<DisplayMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const chat = useChat();

  const { data: convData } = useGetConversation(projectId, agentId);

  const convResponse = (convData as any)?.data?.data;

  // Initialize from existing conversation
  useEffect(() => {
    if (convResponse?.conversation?.messages?.length) {
      setLocalMessages(
        convResponse.conversation.messages.map((m: any, i: number) => ({
          id: `server-${i}`,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      );
    }
  }, [convResponse?.conversation?.messages?.length]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || chat.isPending) return;

    const userMsg: DisplayMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const result = await chat.mutateAsync({ projectId, agentId, data: { message, includeFiles: true, stream: false } });
      const chatResponse = (result as any)?.data?.data;
      if (chatResponse?.response) {
        const assistantMsg: DisplayMessage = {
          id: `resp-${Date.now()}`,
          role: 'assistant',
          content: chatResponse.response.content,
          timestamp: new Date().toISOString(),
        };
        setLocalMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: DisplayMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err?.message || 'Failed to get response'}`,
        timestamp: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, errorMsg]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={localMessages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={<Text style={styles.empty}>Send a message to start chatting</Text>}
        renderItem={({ item }) => (
          <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.msgText, item.role === 'user' && styles.userText]}>
              {item.content}
            </Text>
          </View>
        )}
      />

      {chat.isPending && (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 8 }} />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!chat.isPending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || chat.isPending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || chat.isPending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  msgBubble: { marginHorizontal: 16, marginVertical: 4, padding: 12, borderRadius: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  msgText: { fontSize: 15, lineHeight: 20 },
  userText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
