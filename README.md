### ✨ LinkyChainChat: Secure, Fast, and Feature-Rich Chat 🚀

Welcome to **LinkyChainChat**\! This isn't just another chat app. It's a real-time messaging platform engineered for security, privacy, and an exceptional user experience. Whether you're chatting with friends or sharing work files, LinkyChainChat has you covered. 🛡️

## Core Features 🌟

  - **Real-time Communication ⚡:** Powered by Socket.IO for instant, bi-directional messaging without delays.
  - **End-to-End Encryption 🔒:** All messages are protected with client-side AES encryption using a shared secret key, ensuring your conversations remain private.
  - **Linky Anti Malware (LAM) 🤖:** A built-in security system that actively scans every piece of content in real time.
      - **Malware Protection 🦠:** Scans files and links to prevent threats.
      - **NSFW Filter 🚫:** Automatically identifies and flags "Not Safe For Work" media.
      - **Spam & Phishing Guard 🚮:** Detects and flags spam messages and phishing attempts.
      - **Visual Indicators 👀:** Clear icons and tooltips provide instant security status for every message.
  - **Rich Content Sharing 🎉:**
      - **File Uploads 📂:** Share files of any type with a handy progress indicator.
      - **Link Previews 🔗:** URLs automatically generate rich, informative previews.
      - **Animated GIFs 😂:** Express yourself with a library of fun GIFs.
      - **Code Previews 💻:** View code files directly in the chat window.
  - **Advanced User Interactions ✨:**
      - **Public & Private Chats 👥:** Engage in a general channel or start one-on-one private conversations.
      - **Emoji Reactions ❤️👍:** React to messages with a wide range of emojis.
      - **Typing Indicator ✍️:** See when other users are typing.
      - **Message Deletion 🗑️:** Delete messages you have sent.

## Technologies Used 🛠️

  - **Frontend:**
      - [Next.js](https://nextjs.org/) (React Framework)
      - [TypeScript](https://www.typescriptlang.org/)
      - [Tailwind CSS](https://tailwindcss.com/) (for modern, responsive styling)
      - [Socket.IO Client](https://socket.io/)
      - [Font Awesome](https://fontawesome.com/) (for professional icons)
  - **Backend:**
      - [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
      - [Socket.IO](https://socket.io/)
      - [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) (for database management)
      - [CryptoJS](https://github.com/brix/crypto-js) (for encryption)
      - [Multer](https://github.com/expressjs/multer) (for file handling)

## Quick Start 🏎️

### Prerequisites

  - [Node.js](https://nodejs.org/en/download/) (v14.x or higher)
  - [MongoDB](https://www.mongodb.com/try/download/community) either installed locally and running, or a connection string for a remote instance.

### Instructions

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/LinkyChain/LinkyChain-Chat.git
    cd linkychain-chat
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env.local` file in the project root and add the following:

    ```bash
    # MongoDB connection URI
    MONGODB_URI=mongodb://localhost:27017/linkychain_chat

    # Secret key for message encryption (choose a strong, random key!)
    ENCRYPTION_SECRET_KEY=your-super-secure-secret-key

    # URL of the chat server (for client-side socket connection)
    NEXT_PUBLIC_CHAT_URL=http://localhost:4723
    ```

4.  **Start the server:**

    ```bash
    npm run server
    ```

    The server will be running at `http://localhost:4723`.

5.  **Enjoy the chat\! 🎉**
    Open your browser and navigate to `http://localhost:4723`. Enter a username and start chatting in a secure and fun environment.

## Contributing 🤝

We welcome contributions\! If you have ideas for new features, find a bug, or want to improve the project, please open an issue or submit a pull request. Collaboration is key to building great software.

## License 📄

This project is licensed under the MIT License. See the `LICENSE` file for details.