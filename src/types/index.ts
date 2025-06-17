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
  senderId: string; // UID of sender or "ai"
  receiverId: string; // UID of receiver or "ai"
  content: string;
  timestamp: number; // Firebase ServerValue.TIMESTAMP or a number
  contentType?: 'text' | 'image'; // Optional: for future enhancements
}

export interface ChatMetadata {
  id: string;
  participants: string[]; // [uid1, uid2] or [uid, "ai"]
  lastMessage?: Message;
  lastMessageTimestamp?: number;
  unreadCount?: { [userId: string]: number };
  isAiChat: boolean;
  participantDetails?: {
    [userId: string]: { // or "ai"
      displayName: string | null;
      photoURL: string | null;
      username?: string | null;
    }
  }
}

export interface ChatThread {
  metadata: ChatMetadata;
  messages: Message[];
}

// For userChats structure in RTDB
export interface UserChatInfo {
  otherParticipantId: string; // UID of the other user or "ai"
  lastMessage: string;
  lastMessageSnippet?: string; // Shortened version of lastMessage
  lastMessageTimestamp: number;
  isAiChat: boolean;
  displayName: string | null; // Display name of the other participant
  photoURL: string | null; // Photo URL of the other participant
  unreadMessages?: number; // Count of unread messages for the current user
}
