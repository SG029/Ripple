
import type { User as FirebaseUser } from "firebase/auth";

export interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  username: string | null; // Unique @username
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string; // UID of sender or "ai_assistant"
  text: string;
  timestamp: number | object; // Firebase ServerValue.TIMESTAMP or a number
  contentType?: 'text' | 'image'; 
  senderDisplayName?: string; // Denormalized for easier display
  senderPhotoURL?: string; // Denormalized
}

export interface ChatMetadata {
  id: string; // Composite ID: uid1_uid2 (sorted) or uid_ai_assistant
  participants: string[]; // [uid1, uid2] or [uid, "ai_assistant"]
  participantUids: string[]; // Actual UIDs, excluding "ai_assistant" if present
  isAiChat: boolean;
  lastMessageText?: string;
  lastMessageTimestamp?: number | object;
  lastMessageSenderId?: string;
  unreadCount?: { [userId: string]: number };
  participantDetails: {
    [userId: string]: { // key can be UID or "ai_assistant"
      displayName: string | null;
      photoURL: string | null;
      username?: string | null;
    }
  };
  createdAt: number | object;
  updatedAt: number | object;
}

// For /userChats/{uid}/{chatId} path in RTDB
// Stores info about a user's specific chat for quick sidebar loading
export interface UserChatEntry {
  chatId: string;
  otherParticipantId: string; // UID of the other user or "ai_assistant"
  otherParticipantDisplayName: string | null;
  otherParticipantPhotoURL: string | null;
  otherParticipantUsername?: string | null;
  lastMessageText?: string;
  lastMessageTimestamp?: number; // Resolved timestamp
  lastMessageSenderId?: string;
  unreadMessages: number;
  isAiChat: boolean;
  updatedAt: number; // Resolved timestamp for sorting
}
