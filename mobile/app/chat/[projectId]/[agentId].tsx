import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import { useChat } from '@/api/generated/chat/chat';
import { useGetConversation } from '@/api/generated/conversations/conversations';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  files?: AttachedFile[];
}

interface AttachedFile {
  uri: string;
  name: string;
  size?: number;
  type?: string;
}

const markdownStyles = StyleSheet.create({
  body: { color: '#333', fontSize: 15, lineHeight: 22 },
  heading1: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 12, marginBottom: 6 },
  heading2: { fontSize: 19, fontWeight: '700', color: '#111', marginTop: 10, marginBottom: 4 },
  heading3: { fontSize: 17, fontWeight: '600', color: '#222', marginTop: 8, marginBottom: 4 },
  heading4: { fontSize: 16, fontWeight: '600', color: '#222' },
  paragraph: { marginTop: 4, marginBottom: 4, lineHeight: 22 },
  bullet_list: { marginTop: 2, marginBottom: 2 },
  ordered_list: { marginTop: 2, marginBottom: 2 },
  list_item: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 2, marginBottom: 2 },
  bullet_list_icon: { color: '#555', marginLeft: 10, marginRight: 6 },
  ordered_list_icon: { color: '#555', fontWeight: '600', marginRight: 6 },
  blockquote: { backgroundColor: '#e8e8e8', borderLeftWidth: 3, borderLeftColor: '#999', paddingLeft: 10, paddingRight: 10, marginVertical: 4 },
  code_inline: { backgroundColor: '#e0e0e0', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontFamily: 'Menlo', fontSize: 13 },
  code_block: { backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 6, marginVertical: 6, fontFamily: 'Menlo', fontSize: 13 },
  fence: { backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 6, marginVertical: 6, fontFamily: 'Menlo', fontSize: 13 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  text: { lineHeight: 22 },
  link: { color: '#007AFF', textDecorationLine: 'underline' },
  table: { borderWidth: 1, borderColor: '#ddd', marginVertical: 6 },
  thead: { backgroundColor: '#f5f5f5' },
  th: { padding: 6, fontWeight: '600', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#ddd' },
  tr: { borderBottomWidth: 1, borderColor: '#eee' },
  td: { padding: 6, borderRightWidth: 1, borderColor: '#eee' },
  hr: { backgroundColor: '#ddd', height: 1, marginVertical: 8 },
});

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatScreen() {
  const { projectId, agentId } = useLocalSearchParams<{ projectId: string; agentId: string }>();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<DisplayMessage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const chat = useChat();

  const { data: convData } = useGetConversation(projectId, agentId);
  const convResponse = (convData as any)?.data?.data;

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

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        const files: AttachedFile[] = result.assets.map(a => ({
          uri: a.uri,
          name: a.name,
          size: a.size,
          type: a.mimeType,
        }));
        setAttachedFiles(prev => [...prev, ...files]);
      }
    } catch (e) {
      // User cancelled or error
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets) {
        const files: AttachedFile[] = result.assets.map(a => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          size: a.fileSize,
          type: a.mimeType,
        }));
        setAttachedFiles(prev => [...prev, ...files]);
      }
    } catch (e) {
      // User cancelled or error
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const message = input.trim();
    if ((!message && attachedFiles.length === 0) || chat.isPending) return;

    const fileNames = attachedFiles.map(f => f.name).join(', ');
    const displayContent = message + (fileNames ? `\n📎 ${fileNames}` : '');

    const userMsg: DisplayMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: displayContent,
      timestamp: new Date().toISOString(),
      files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };
    setLocalMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFiles([]);

    try {
      const result = await chat.mutateAsync({
        projectId,
        agentId,
        data: { message: message || `Attached files: ${fileNames}`, includeFiles: true, stream: false },
      });
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
        content: `**Error:** ${err?.message || 'Failed to get response'}`,
        timestamp: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, errorMsg]);
    }
  };

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {/* Show attached file chips */}
        {item.files && item.files.length > 0 && (
          <ScrollView horizontal style={styles.fileChips} showsHorizontalScrollIndicator={false}>
            {item.files.map((f, i) => (
              <View key={i} style={[styles.fileChip, isUser && styles.fileChipUser]}>
                <Text style={[styles.fileChipText, isUser && styles.fileChipTextUser]} numberOfLines={1}>
                  📎 {f.name}
                </Text>
                {f.size ? <Text style={[styles.fileChipSize, isUser && styles.fileChipTextUser]}>
                  {formatFileSize(f.size)}
                </Text> : null}
              </View>
            ))}
          </ScrollView>
        )}
        {isUser ? (
          <Text style={styles.userText}>{item.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{item.content}</Markdown>
        )}
      </View>
    );
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
        onLayout={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={<Text style={styles.empty}>Send a message to start chatting</Text>}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={localMessages.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 8 }}
      />

      {chat.isPending && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <ScrollView horizontal style={styles.attachmentsBar} showsHorizontalScrollIndicator={false}>
          {attachedFiles.map((f, i) => (
            <View key={i} style={styles.attachmentItem}>
              {f.type?.startsWith('image/') ? (
                <Image source={{ uri: f.uri }} style={styles.attachmentThumb} />
              ) : (
                <View style={styles.attachmentDocIcon}>
                  <Text style={styles.attachmentDocExt}>
                    {f.name.split('.').pop()?.toUpperCase()?.slice(0, 4) || 'FILE'}
                  </Text>
                </View>
              )}
              <Text style={styles.attachmentName} numberOfLines={1}>{f.name}</Text>
              <TouchableOpacity style={styles.attachmentRemove} onPress={() => removeFile(i)}>
                <Text style={styles.attachmentRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        {/* File picker buttons */}
        <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={chat.isPending}>
          <Text style={styles.attachBtnIcon}>🖼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} onPress={pickDocument} disabled={chat.isPending}>
          <Text style={styles.attachBtnIcon}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!chat.isPending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() && attachedFiles.length === 0) || chat.isPending ? styles.sendBtnDisabled : null]}
          onPress={handleSend}
          disabled={(!input.trim() && attachedFiles.length === 0) || chat.isPending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  msgBubble: { marginHorizontal: 16, marginVertical: 4, padding: 12, borderRadius: 14, maxWidth: '90%' },
  userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#f5f5f5', alignSelf: 'flex-start' },
  userText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  fileChips: { flexDirection: 'row', marginBottom: 6 },
  fileChip: { backgroundColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 4, maxWidth: 150 },
  fileChipUser: { backgroundColor: 'rgba(255,255,255,0.25)' },
  fileChipText: { fontSize: 11, color: '#333' },
  fileChipTextUser: { color: '#fff' },
  fileChipSize: { fontSize: 9, color: '#888' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingVertical: 6 },
  loadingText: { color: '#999', fontSize: 13, marginLeft: 8 },

  /* Attachment bar */
  attachmentsBar: {
    maxHeight: 80, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fafafa',
  },
  attachmentItem: {
    width: 72, marginRight: 8, alignItems: 'center', position: 'relative',
  },
  attachmentThumb: { width: 56, height: 56, borderRadius: 8, resizeMode: 'cover' },
  attachmentDocIcon: {
    width: 56, height: 56, borderRadius: 8, backgroundColor: '#e8e8e8',
    justifyContent: 'center', alignItems: 'center',
  },
  attachmentDocExt: { fontSize: 11, fontWeight: '700', color: '#555' },
  attachmentName: { fontSize: 9, color: '#666', marginTop: 2, textAlign: 'center', width: '100%' },
  attachmentRemove: {
    position: 'absolute', top: -4, right: -4, width: 20, height: 20,
    borderRadius: 10, backgroundColor: '#ff3b30', justifyContent: 'center', alignItems: 'center',
  },
  attachmentRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  /* Input row */
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#eee', alignItems: 'flex-end' },
  attachBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  attachBtnIcon: { fontSize: 18 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100, backgroundColor: '#fafafa',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
