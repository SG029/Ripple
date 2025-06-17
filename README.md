# Ripple Chat 🌊

Ripple Chat is a modern, real-time web chat application built with Next.js, Firebase, Tailwind CSS, ShadCN UI, and Genkit for AI-powered features. It allows users to engage in one-on-one conversations, chat with an AI Assistant, search for other users, and customize their experience with theme selection.

## ✨ Key Features

*   **Real-time Messaging:** Instantaneous message delivery using Firebase Realtime Database.
*   **User-to-User Chat:** Search for and start private conversations with other registered users.
*   **AI Assistant:** Integrated Genkit-powered AI chatbot for assistance and conversation.
*   **Recent Chats Sidebar:** Quickly access ongoing conversations, with unread message indicators.
*   **Message Selection & Deletion:** Users can select and delete their own messages within a chat.
*   **User Authentication:** Secure email/password and Google Sign-In/Sign-Up.
*   **User Profiles:** Customizable display names, unique usernames, and profile photos.
*   **Theme Customization:** Light, Dark, and System theme options available in settings.
*   **Responsive Design:** Adapts to various screen sizes for a seamless experience on desktop and mobile.
*   **Modern UI:** Built with ShadCN UI components and styled with Tailwind CSS.

## 🛠️ Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Authentication & Database:** Firebase (Auth & Realtime Database)
*   **AI Integration:** Genkit (with Google AI)
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **Form Handling:** React Hook Form & Zod
*   **State Management:** React Context API, `useState`, `useEffect`
*   **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A Firebase project (see Firebase Setup below)

### Firebase Setup

1.  **Create a Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Authentication:**
    *   In your Firebase project, go to "Authentication" -> "Sign-in method".
    *   Enable "Email/Password" and "Google" providers.
3.  **Set up Realtime Database:**
    *   Go to "Realtime Database" and create a database. Start in **test mode** for initial development, but secure your rules before production.
    *   **Database Rules:** Update your Realtime Database rules to allow appropriate read/write access. A basic secure setup might look like this (adapt as needed):
        ```json
        {
          "rules": {
            "users": {
              "$uid": {
                ".read": "auth != null && auth.uid == $uid",
                ".write": "auth != null && auth.uid == $uid"
              }
            },
            "usernames": {
              ".read": "auth != null",
              "$username": {
                // Allow write if user is creating their own username link or is admin (not shown)
                ".write": "auth != null && (!data.exists() || data.val() == auth.uid)"
              }
            },
            "chats": {
              "$chatId": {
                ".read": "auth != null && data.child('participants').child(auth.uid).exists()",
                ".write": "auth != null && (data.child('participants').child(auth.uid).exists() || (!data.exists() && newData.child('participants').child(auth.uid).exists()))"
                // Add indexing for query performance
                // ".indexOn": ["updatedAt"] // Example, check participantUids if querying on that
              }
            },
            "chatMessages": {
              "$chatId": {
                ".read": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()",
                "$messageId": {
                  ".write": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists() && (newData.child('senderId').val() == auth.uid || newData.child('senderId').val() == 'ai_assistant')",
                   // Allow deletion only by the sender for their own messages
                  ".validate": "(!data.exists() || data.child('senderId').val() === auth.uid) || !newData.exists()"
                },
                // Add indexing for query performance
                ".indexOn": ["timestamp"]
              }
            },
            "userChats": {
              "$uid": {
                ".read": "auth != null && auth.uid == $uid",
                ".write": "auth != null && auth.uid == $uid",
                // Add indexing for query performance
                ".indexOn": ["updatedAt"]
              }
            }
          }
        }
        ```
    *   **Database Indexing:** For optimal performance, especially with sorting and filtering, add indexes to your Firebase Realtime Database. Go to your Database rules section and add indexes like:
        *   For `/userChats/{uid}`: Index on `updatedAt`.
        *   For `/chatMessages/{chatId}`: Index on `timestamp`.
        *   For `/chats`: If you plan to query chats based on participant UIDs or `updatedAt`, consider indexing those fields too.
4.  **Get Firebase Config:**
    *   In your Firebase project settings (Project Overview -> Project settings), find your web app's Firebase configuration snippet.
    *   Copy these credentials into `src/lib/firebase.ts`.
5.  **Environment Variables (for Genkit/Google AI):**
    *   If you are using Genkit with Google AI (Gemini), you'll need an API key.
    *   Create a `.env` file in the root of your project:
        ```
        GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
        ```
    *   Replace `YOUR_GOOGLE_API_KEY` with your actual Google AI Studio API key.

### Installation & Running

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd ripple-chat
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Run the development server for Next.js:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002` (or another port if 9002 is busy).

4.  **Run the Genkit development server (in a separate terminal):**
    This is necessary for the AI Assistant features to work.
    ```bash
    npm run genkit:dev
    # or for watching changes in Genkit flows
    npm run genkit:watch
    ```

## 📜 Available Scripts

In the project directory, you can run:

*   `npm run dev`: Runs the Next.js app in development mode with Turbopack.
*   `npm run genkit:dev`: Starts the Genkit development server.
*   `npm run genkit:watch`: Starts the Genkit development server and watches for file changes.
*   `npm run build`: Builds the app for production.
*   `npm run start`: Starts a Next.js production server.
*   `npm run lint`: Lints the project files.
*   `npm run typecheck`: Runs TypeScript type checking.

## 🎨 UI & Styling

*   **ShadCN UI:** Components are located in `src/components/ui`. You can add more components using the ShadCN CLI: `npx shadcn-ui@latest add <component_name>`.
*   **Tailwind CSS:** Configuration is in `tailwind.config.ts`. Global styles and theme variables are in `src/app/globals.css`.
*   **Theme Variables:** CSS HSL variables in `src/app/globals.css` define the color palette for light and dark modes.

## 🤖 Genkit AI Integration

*   **AI Flows:** Genkit flows (e.g., for the AI chatbot) are located in `src/ai/flows/`.
*   **Genkit Configuration:** The core Genkit setup is in `src/ai/genkit.ts`.
*   **Development Server:** Remember to run `npm run genkit:dev` alongside `npm run dev` to use AI features locally.

## 💡 Further Development

*   **Error Handling:** Enhance global error handling and provide more specific user feedback.
*   **Advanced Chat Features:** Group chats, message replies, typing indicators, read receipts.
*   **Push Notifications:** Implement Firebase Cloud Messaging for new message notifications.
*   **File Sharing:** Allow users to share images or files in chats.
*   **Testing:** Add unit and integration tests.

---

Enjoy building and using Ripple Chat!
