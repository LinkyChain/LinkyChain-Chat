/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Head from 'next/head';
import '../styles/globals.css';
import { useState, useEffect, FormEvent, useRef, ReactNode, createContext, useContext, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Howl } from 'howler';
import { marked } from 'marked';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold, faItalic, faUnderline, faLink, faUpload, faPaperPlane, faCircle, faUser, faFileCode, 
  faSmile, faTimesCircle, faExclamationTriangle, faShieldVirus, faLock,
  faFire, faSpinner, faMusic, faExternalLinkAlt, faImage, faPaperclip, faVideo,
  faMeteor, faGlobe, faCog,
  faKeyboard, faTrashAlt,
  faClock,
  faBomb,
  faCircleInfo,
  faCat
} from '@fortawesome/free-solid-svg-icons';
import {
  faGrinSquint, faSadTear, faThumbsUp, faHeart, faLaughSquint
} from '@fortawesome/free-regular-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';

import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

import EmojiPicker, { EmojiClickData, Theme as EmojiTheme } from 'emoji-picker-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import ClickSpark from './components/ClickSpark';
import LAM from './components/LAM'

config.autoAddCss = false;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}





const SocketContext = createContext<SocketContextType | undefined>(undefined);

let socketInstance: Socket | null = null;
const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io();
  }
  return socketInstance;
};

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = getSocket();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected!');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected!');
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

const ENCRYPTION_SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY || 'your-super-secret-key-12345';
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || '';

const giphyFetch = new GiphyFetch(GIPHY_API_KEY);

const encrypt = (text: string): string => {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET_KEY).toString();
};

const decrypt = (ciphertext: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_SECRET_KEY);
        if (bytes.sigBytes === 0) {
            return "Content Protected by AES Encryption 🔐 [Invalid Content]";
        }
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return "Content Protected by AES Encryption 🔐 [Decryption Error]";
    }
};

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

interface BaseMessage {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  recipientId?: string;
  reactions?: { [emoji: string]: Reaction };
  encryptedContent: string;
  userProfilePicture?: string;
  status: 'pending' | 'sent' | 'failed';
  scanStatus?: 'pending' | 'scanning' | 'clean' | 'malware';
  nsfwStatus?: 'pending' | 'scanning' | 'sfw' | 'nsfw';
  spamStatus?: 'pending' | 'scanning' | 'clean' | 'spam';
}

interface ChatMessage extends BaseMessage {
  type: 'text';
}

interface FileMessage extends BaseMessage {
  type: 'file';
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadProgress?: number;
  filePath?: string;
}

interface LinkMessage extends BaseMessage {
  type: 'link';
  linkPreview?: LinkPreview;
}

interface GifMessage extends BaseMessage {
  type: 'gif';
  gifUrl: string;
}

type Message = ChatMessage | FileMessage | LinkMessage | GifMessage;

interface OnlineUser {
  id: string;
  userName: string;
  isTyping?: boolean;
  profilePicture?: string;
}

const availableEmojis = [
  { icon: faThumbsUp, emoji: '👍' },
  { icon: faHeart, emoji: '❤️' },
  { icon: faLaughSquint, emoji: '😂' },
  { icon: faFire, emoji: '🔥' },
  { icon: faSadTear, emoji: '😭' },
  { icon: faGrinSquint, emoji: '😁' },
];


const codeFileExtensions = [
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'pyw', 'java', 'c', 'cpp', 'cc', 'cxx', 'cs', 'go', 'rb', 'php', 'phtml', 'swift', 'kt', 'kts', 'rs', 'pl', 'pm', 'lua', 'dart', 'erl', 'hrl', 'pas', 'd', 'fs', 'hx', 'ex', 'exs', 'nim', 'cr', 'clj', 'cljs', 'cljc', 'hs', 'lhs', 'jl', 'vb', 'f', 'for', 'f90', 'f95', 'cob', 'cbl', 's', 'asm', 'tcl', 'r', 'pro', 'm', 'mat',

  'sh', 'bash', 'zsh', 'bat', 'ps1', 'cmd',

  'html', 'htm', 'xml', 'xhtml', 'css', 'scss', 'sass', 'less', 'json', 'jsonc', 'yml', 'yaml', 'md', 'markdown', 'txt', 'csv', 'tsv', 'ini', 'cfg', 'conf', 'sql', 'graphql', 'proto', 'toml', 'svg',

  'editorconfig', 'gitignore', 'gitattributes', 'npmignore', 'dockerfile', 'makefile', 'make', 'project', 'log', 'lock', 'package.json', 'tsconfig.json', 'jsconfig.json', 'babelrc', 'prettierrc', 'eslintrc',

  'h', 'hpp', 'hh', 'hxx', 'inc',

  'pug', 'jade', 'hbs', 'handlebars', 'ejs', 'tpl', 'twig',

  'svelte', 'vue', 'astro',

  'glsl', 'hlsl', 'shader', 'vert', 'frag', 'geo', 'comp'
];
const isCodeFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension && codeFileExtensions.includes(extension);
};

// coming soon 🐈☕
const catppuccinMacchiato = {
    'code[class*="language-"]': {
        'color': '#cad3f5',
        'background': '#24273a',
        'fontFamily': 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        'textAlign': 'left',
        'whiteSpace': 'pre',
        'wordSpacing': 'normal',
        'wordBreak': 'normal',
        'wordWrap': 'normal',
        'lineHeight': '1.5',
        'MozTabSize': '4',
        'OTabSize': '4',
        'tabSize': '4',
        'WebkitHyphens': 'none',
        'MozHyphens': 'none',
        'msHyphens': 'none',
        'hyphens': 'none',
        'padding': '1em',
        'margin': '.5em 0',
        'overflow': 'auto',
        'borderRadius': '0.3em'
    },
    'pre[class*="language-"]': {
        'color': '#cad3f5',
        'background': '#24273a',
        'fontFamily': 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        'textAlign': 'left',
        'whiteSpace': 'pre',
        'wordSpacing': 'normal',
        'wordBreak': 'normal',
        'wordWrap': 'normal',
        'lineHeight': '1.5',
        'MozTabSize': '4',
        'OTabSize': '4',
        'tabSize': '4',
        'WebkitHyphens': 'none',
        'MozHyphens': 'none',
        'msHyphens': 'none',
        'hyphens': 'none',
        'padding': '1em',
        'margin': '.5em 0',
        'overflow': 'auto',
        'borderRadius': '0.3em'
    },
    ':not(pre) > code[class*="language-"]': {
        'background': '#1e202e',
        'padding': '.1em',
        'borderRadius': '.3em',
        'whiteSpace': 'normal'
    },
    'comment': { 'color': '#6c7086' },
    'prolog': { 'color': '#6c7086' },
    'doctype': { 'color': '#6c7086' },
    'cdata': { 'color': '#6c7086' },
    'punctuation': { 'color': '#cad3f5' },
    'operator': { 'color': '#cad3f5' },
    'tag': { 'color': '#c6a0f6' },
    'keyword': { 'color': '#c6a0f6' },
    'boolean': { 'color': '#8aadf4' },
    'number': { 'color': '#8aadf4' },
    'constant': { 'color': '#a5adcb' },
    'symbol': { 'color': '#c6a0f6' },
    'class-name': { 'color': '#f5bde6' },
    'function': { 'color': '#91d7e3' },
    'string': { 'color': '#a6da95' },
    'attr-value': { 'color': '#a6da95' },
    'attr-name': { 'color': '#f0c6c6' },
    'entity': { 'cursor': 'help' },
    'url': { 'color': '#91d7e3' },
    'variable': { 'color': '#ee99a0' },
};

const MessageBubble: React.FC<{
  message: Message;
  isSelf: boolean;
  socketId: string;
  onAddReaction: (messageId: string, emoji: string, recipientId?: string) => void;
  onDeleteMessage: (messageId: string, recipientId?: string) => void;
  onlineUsers: OnlineUser[];
  
}> = ({ message, isSelf, socketId, onAddReaction, onDeleteMessage, onlineUsers }) => {

  

  const decryptedContent = decrypt(message.encryptedContent);

  const isFile = (msg: Message): msg is FileMessage => msg.type === 'file';
  const isLink = (msg: Message): msg is LinkMessage => msg.type === 'link';
  const isText = (msg: Message): msg is ChatMessage => msg.type === 'text';
  const isGif = (msg: Message): msg is GifMessage => msg.type === 'gif';



  const userProfile = onlineUsers.find(user => user.id === message.userId)?.profilePicture || message.userProfilePicture;
  const itemRef = useRef<HTMLLIElement>(null);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [hoveredReactionEmoji, setHoveredReactionEmoji] = useState<string | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [codeContent, setCodeContent] = useState<string | null>(null);

  useEffect(() => {
    if (itemRef.current) {
    }
  }, []);

  const downloadFile = (message: FileMessage) => {
    try {
      if (message.id) {
        const downloadUrl = `/download/${message.id}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = message.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
          console.warn("Cannot download: File ID not found.", message);
          alert("Error: File data not available for download.");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file. The file data might be corrupted or too large.");
    }
  };

  const previewCodeFile = async (message: FileMessage) => {
      if (!message.id) return;
      if (showCodePreview && codeContent) {
          setShowCodePreview(false);
          return;
      }
      setShowCodePreview(true);
      setCodeContent("Loading file content...");
      try {
          const response = await fetch(`/download/${message.id}`);
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          const text = await response.text();
          setCodeContent(text);
      } catch (error) {
          console.error("Failed to fetch code file:", error);
          setCodeContent("Failed to load file content.");
      }
  };


  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderFilePreview = (message: FileMessage) => {
    const isImageFile = message.fileType.startsWith('image/');
    const isAudioFile = message.fileType.startsWith('audio/');
    const isVideoFile = message.fileType.startsWith('video/');
    const fileMessage = message as FileMessage;
    const isUploading = fileMessage.uploadProgress !== undefined && fileMessage.uploadProgress < 100;
    const fileSource = `/download/${fileMessage.id}`;

    if (isUploading) {
      return (
        <div className="flex flex-col gap-1 bg-linkychain-dark-200 p-3 rounded-lg border border-linkychain-dark-100 ">
          <div className="flex items-center gap-2 text-linkychain-gray-100">
            <span className="text-sm font-medium break-all">{fileMessage.fileName}</span>
            {fileMessage.fileSize && (
              <span className="text-xs text-linkychain-gray-200 ml-auto">
                {(fileMessage.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
          <div className="w-full bg-linkychain-dark-100 rounded-full h-2.5 mt-2">
            <div
              className="bg-linkychain-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${fileMessage.uploadProgress}%` }}
            ></div>
          </div>
          <span className="text-xs text-linkychain-gray-200 text-center mt-1 block">
            Uploading: {fileMessage.uploadProgress.toFixed(0)}%
          </span>
        </div>
      );
    }
    
    if (isImageFile) {
      return (
        <div className="flex flex-col gap-1 bg-linkychain-dark-200 p-3 rounded-lg border border-linkychain-dark-100 ">
            <img
                src={fileSource}
                alt={fileMessage.fileName}
                className="message-image max-w-full h-auto max-h-64 object-contain rounded-lg mb-2 cursor-pointer"
                onLoad={() => { /* Handle image loaded */ }}
                onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/image_load_error.gif';
                    (e.target as HTMLImageElement).alt = 'Image failed to load';
                    console.error('Image failed to load from:', fileSource);
                }}
            />
          <div className="flex items-center gap-2 text-linkychain-gray-100">
            <FontAwesomeIcon icon={faImage} className="w-5 h-5 text-linkychain-gray-200" />
            <span className="text-sm font-medium break-all">{fileMessage.fileName}</span>
            {fileMessage.fileSize && (
              <span className="text-xs text-linkychain-gray-200 ml-auto">
                {(fileMessage.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
          <button
            onClick={() => downloadFile(fileMessage)}
            className="mt-2 app-btn-primary py-1 px-3 rounded-lg text-xs font-semibold  transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-95 w-fit"
            title="Download file"
          >
            Download
          </button>
        </div>
      );
    } else if (isAudioFile) {
      return (
        <div className="flex flex-col gap-2 bg-linkychain-dark-200 p-3 rounded-lg border border-linkychain-dark-100  w-full max-w-lg">
          <div className="flex items-center gap-2 text-linkychain-gray-100 mb-1">
            <FontAwesomeIcon icon={faMusic} className="w-5 h-5 text-linkychain-blue-500" />
            <span className="text-sm font-medium break-all">{fileMessage.fileName}</span>
            {fileMessage.fileSize && (
              <span className="text-xs text-linkychain-gray-200 ml-auto">
                {(fileMessage.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
          <button
            onClick={() => downloadFile(fileMessage)}
            className="mt-2 app-btn-primary py-1 px-3 rounded-lg text-xs font-semibold  transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-95 w-fit"
            title="Download file"
          >
            Download
          </button>
        </div>
      );
    } else if (isVideoFile) {
      return (
        <div className="flex flex-col gap-2 bg-linkychain-dark-200 p-3 rounded-lg border border-linkychain-dark-100  w-full max-w-lg">
          <div className="flex items-center gap-2 text-linkychain-gray-100 mb-1">
            <FontAwesomeIcon icon={faVideo} className="w-5 h-5 text-linkychain-blue-500" />
            <span className="text-sm font-medium break-all">{fileMessage.fileName}</span>
            {fileMessage.fileSize && (
              <span className="text-xs text-linkychain-gray-200 ml-auto">
                {(fileMessage.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
          <button
            onClick={() => downloadFile(fileMessage)}
            className="mt-2 app-btn-primary py-1 px-3 rounded-lg text-xs font-semibold  transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-95 w-fit"
            title="Download file"
          >
            Download
          </button>
        </div>
      );
    } else {
      const isCode = isCodeFile(fileMessage.fileName);

      return (
        <div className="flex flex-col gap-2 bg-linkychain-dark-200 p-3 rounded-lg border border-linkychain-dark-100 ">
          <div className="flex items-center gap-2 text-linkychain-gray-100">
            <FontAwesomeIcon icon={faFileCode} className="w-5 h-5 text-linkychain-gray-200" />
            <span className="text-sm font-medium break-all">{fileMessage.fileName}</span>
            {fileMessage.fileSize && (
              <span className="text-xs text-linkychain-gray-200 ml-auto">
                {(fileMessage.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
          <button
            onClick={() => downloadFile(fileMessage)}
            className="mt-2 app-btn-primary py-1 px-3 rounded-lg text-xs font-semibold  transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-95 w-fit"
            title="Download file"
          >
            Download
          </button>
        </div>
      );
    }
  };

 const renderLinkPreview = (message) => {
    const linkMessage = message; 
    const url = decrypt(linkMessage.encryptedContent);
    const preview = linkMessage.linkPreview;

    return (
      <div className="flex flex-col gap-2 p-3 bg-linkychain-dark-200 rounded-lg border border-linkychain-dark-100">
        
        {linkMessage.text && (
          <p className="text-linkychain-gray-100 break-words">
            {linkMessage.text}
          </p>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-linkychain-dark-100 overflow-hidden">
          {preview?.image && (
            <img
              src={preview.image}
              alt={preview.title || 'Link preview image'}
              className="w-full h-32 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="p-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-linkychain-blue-500 hover:underline break-all block text-base font-semibold"
              title="Open link in new tab"
            >
              {preview?.title || url}
              <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1 text-xs" />
            </a>
            {preview?.description && (
              <p className="text-sm text-linkychain-gray-200 mt-1 line-clamp-2">
                {preview.description}
              </p>
            )}
            <span className="text-xs text-linkychain-gray-300 mt-2 block break-all">
              {url}
            </span>
          </div>
        </div>
      </div>
    );
};

  const renderGif = (message: GifMessage) => {
    const gifMessage = message as GifMessage;
    return (
      <img
        src={gifMessage.gifUrl}
        alt="GIF"
        className="max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg rounded-lg "
      />
    );
  };

  const getReactionUsersTooltip = (emoji: string) => {
    const reaction = message.reactions?.[emoji];
    if (!reaction) return '';

    const usersReacted = reaction.users.map(userId => {
      const user = onlineUsers.find(u => u.id === userId);
      return user ? user.userName : 'Unknown User';
    });
    return `Reacted by: ${usersReacted.join(', ')}`;
  };

  return (
    <li
      ref={itemRef}
      className={`relative flex items-start py-1.5 px-4 mb-1 rounded-lg transition-all duration-200 group opacity-0 animate-fade-in-up
        ${showActions ? 'bg-linkychain-dark-100' : 'hover:bg-linkychain-dark-100'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!showReactionsPicker) setShowActions(false); }}
    >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mr-3 mt-1 relative overflow-hidden bg-linkychain-blue-500">
            {userProfile ? (
              <img src={userProfile} alt={`${message.userName}'s profile`} className="w-full h-full object-cover" />
            ) : (
              <FontAwesomeIcon icon={faUser} className="text-xl" />
            )}
        </div>
        <div className="flex-1 flex flex-col">
            <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-linkychain-blue-500 font-semibold text-base">
                    {message.userName}
                </span>
                <span className="text-xs text-linkychain-gray-200">
                    {formatTimestamp(message.timestamp)}
                </span>
                {message.status === 'failed' && (
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-linkychain-red-500 text-sm ml-auto" title="Failed to send" />
                )}
            </div>
            <div className="text-linkychain-gray-100 text-base break-all overflow-hidden whitespace-pre-wrap max-w-sm">
                {isText(message) && <div dangerouslySetInnerHTML={{ __html: marked.parse(decryptedContent) }} />}
                {isFile(message) && renderFilePreview(message)}
                {isLink(message) && renderLinkPreview(message)}
                {isGif(message) && renderGif(message)}

                {(isText(message) || isFile(message) || isLink(message)) && (
                    <LAM
                        messageId={message.id}
                        isLink={isLink(message)}
                        initialStatus={{
                            scan: message.scanStatus,
                            nsfw: message.nsfwStatus,
                            spam: message.spamStatus,
                        }}
                    />
                )}
            </div>
            {message.reactions && Object.entries(message.reactions).length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-linkychain-dark-100">
                    {Object.entries(message.reactions).map(([emoji, reaction]) => (
                        <div
                            key={emoji}
                            className="relative"
                            onMouseEnter={() => setHoveredReactionEmoji(emoji)}
                            onMouseLeave={() => setHoveredReactionEmoji(null)}
                        >
                            <button
                                onClick={() => onAddReaction(message.id, emoji, message.recipientId)}
                                className={`flex items-center text-xs px-2 py-1 rounded-full border transition-colors duration-200
                                    ${reaction.users.includes(socketId) ? 'bg-linkychain-blue-500 border-linkychain-blue-500 text-white' : 'bg-linkychain-dark-200 border-linkychain-dark-100 text-linkychain-gray-100 hover:bg-linkychain-dark-100'}`}
                                title={getReactionUsersTooltip(emoji)}
                            >
                                {emoji} {reaction.count}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {showActions && (
          <div className="absolute top-0 right-4 -mt-3.5 bg-linkychain-dark-200 rounded-md  border border-linkychain-dark-100 p-1 flex gap-1 z-10 transition-opacity duration-200 opacity-0 group-hover:opacity-100 animate-slide-in-right">
            <button
              onClick={() => setShowReactionsPicker(!showReactionsPicker)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-linkychain-gray-200 hover:bg-linkychain-dark-100 hover:text-linkychain-gray-100 transition-all duration-150"
              title="Add Reaction"
            >
              <FontAwesomeIcon icon={faSmile} />
            </button>
            {isSelf && (
  <button
    onClick={() => onDeleteMessage(message.id, message.recipientId)}
    className="..."
    title="Delete Message"
  >
    <FontAwesomeIcon icon={faTrashAlt} />
  </button>
)}
            {showReactionsPicker && (
              <div className="absolute top-full right-0 mt-1 bg-linkychain-dark-200 rounded-md  border border-linkychain-dark-100 p-2 flex gap-1 animate-scale-in origin-top-right">
                {availableEmojis.map((e) => (
                  <button
                    key={e.emoji}
                    onClick={() => {
                      onAddReaction(message.id, e.emoji, message.recipientId);
                      setShowReactionsPicker(false);
                      setShowActions(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-2xl text-linkychain-gray-100 hover:bg-linkychain-dark-100 transition-colors duration-150"
                    title={e.emoji}
                  >
                    <FontAwesomeIcon icon={e.icon} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
    </li>
  );
};

const ChannelDescription: React.FC<{ currentRecipient: OnlineUser | null }> = ({ currentRecipient }) => {
  if (currentRecipient) {
    return (
      <div className="text-sm text-linkychain-gray-200 mt-2">
        This is the start of your private conversation with{' '}
        <span className="font-semibold text-white">{currentRecipient.userName}</span>.
        (chats are automatically deleted every 30 minutes)
      </div>
    );
  }
  return (
    <div className="text-sm text-linkychain-gray-200 mt-2">
      Welcome to the <span className="font-semibold text-white">World Chat</span>! This is a public channel for everyone to connect and share.
      (chats are automatically deleted every 30 minutes)
    </div>
  );
};



const HomePageContent: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<{ [userId: string]: Message[] }>({});
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLUListElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [userName, setUserName] = useState<string>('Connecting...');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentChatRecipient, setCurrentChatRecipient] = useState<OnlineUser | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const privateMessageSound = useRef<Howl | null>(null);
  const publicMessageSound = useRef<Howl | null>(null);
  const countdownAlertSound = useRef<Howl | null>(null);
  const chatDeletedSound = useRef<Howl | null>(null);
  const messageDeletedSound = useRef<Howl | null>(null);

  const [appStatus, setAppStatus] = useState<'active' | 'warning' | 'error'>('active');
  const [errorMessages, setTipMessages] = useState<string[]>([]);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [dataFlowRate, setDataFlowRate] = useState(0);
  const dataFlowIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [userSearchTerm, setUserSearchTerm] = useState('');

  const userOnlineEmitted = useRef(false);

  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const userProfilePictureInputRef = useRef<HTMLInputElement>(null);

  const myUserProfile = onlineUsers.find(u => u.id === socket?.id)?.profilePicture || userProfilePicture;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('trending');
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const [gifGutter, setGifGutter] = useState<number>(6);
  const [gifWidth, setGifWidth] = useState<number>(300);
  
  const activeUploads = useRef<{ [key: string]: { file: File, progress: number, recipientId?: string } }>({});
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const checkClickOutside = useCallback((ref: React.RefObject<HTMLElement>, setter: (value: boolean) => void) => (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setter(false);
    }
  }, []);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (socket) {
      socket.on('countdown update', (remainingSeconds: number) => {
        setCountdown(remainingSeconds);
        if (remainingSeconds === 5 && countdownAlertSound.current) {
          countdownAlertSound.current.play();
        }
      });
    }
    return () => {
      if (socket) socket.off('countdown update');
    };
  }, [socket]);

  useEffect(() => {
    const socket = io();
    socket.on('server reload', () => {
      console.log('The server requested a reload. Reloading the page....');
      window.location.reload();
      if (chatDeletedSound.current) {
        chatDeletedSound.current.play();
      }
    });
    return () => {
      socket.off('server reload');
    };
  }, []);


  useEffect(() => {
    if (!socket) return;

    const handleMessageDeleted = ({ messageId, isPrivate }: { messageId: string, isPrivate: boolean }) => {
        if (isPrivate) {
            setPrivateMessages(prev => {
                const updatedState: { [userId: string]: Message[] } = {};
                for (const userId in prev) {
                    updatedState[userId] = prev[userId].filter(msg => msg.id !== messageId);
                }
                return updatedState;
            });
        } else {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        }
        if (messageDeletedSound.current) {
            messageDeletedSound.current.play();
        }
    };

    socket.on('message deleted', handleMessageDeleted);

    return () => {
        socket.off('message deleted', handleMessageDeleted);
    };
}, [socket, setMessages, setPrivateMessages]);



const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
};

  useEffect(() => {
    document.addEventListener('mousedown', checkClickOutside(emojiPickerRef, setShowEmojiPicker));
    document.addEventListener('mousedown', checkClickOutside(gifPickerRef, setShowGifPicker));
    document.addEventListener('mousedown', checkClickOutside(profileMenuRef, setShowProfileMenu));

    return () => {
      document.removeEventListener('mousedown', checkClickOutside(emojiPickerRef, setShowEmojiPicker));
      document.removeEventListener('mousedown', checkClickOutside(gifPickerRef, setShowGifPicker));
      document.removeEventListener('mousedown', checkClickOutside(profileMenuRef, setShowProfileMenu));
    };
  }, [checkClickOutside]);


  useEffect(() => {
    privateMessageSound.current = new Howl({
      src: ['/sounds/private_notification.mp3'],
      volume: 0.5
    });
    publicMessageSound.current = new Howl({
      src: ['/sounds/public_notification.mp3'],
      volume: 0.3
    });

    countdownAlertSound.current = new Howl({ 
      src: ['/sounds/countdown-alert.mp3'],
      volume: 0.5 
    });

    chatDeletedSound.current = new Howl({ 
      src: ['/sounds/chat-deleted.mp3'],
      volume: 0.5
    });

    messageDeletedSound.current = new Howl({
      src: ['/sounds/message-deleted.mp3'],
      volume: 0.5
    });

    const storedUserName = localStorage.getItem('linkychain_username');
    if (storedUserName) {
      setUserName(storedUserName);
    } else {
      const generatedName = generateUserName();
      setUserName(generatedName);
      localStorage.setItem('linkychain_username', generatedName);
    }

    const storedProfilePicture = localStorage.getItem('linkychain_profile_picture');
    if (storedProfilePicture) {
      setUserProfilePicture(storedProfilePicture);
    }

  }, []);

  const generateUserName = () => {
    const adjectives = ['Cold', 'Warm', 'New', 'Old', 'Fast', 'Slow', 'Tall', 'Short', 'Bright', 'Dark', 'Clean', 'Dirty', 'Hard', 'Soft', 'Good', 'Bad', 'Big', 'Small', 'High', 'Low', 'Fine', 'Rough', 'Dry', 'Wet', 'Strong', 'Weak', 'True', 'False', 'Light', 'Heavy', 'Free', 'Deep', 'Quick', 'Loud', 'Quiet', 'Sharp', 'Dull', 'Calm', 'Brave', 'Bold', 'Cute', 'Wise', 'Wild', 'Mild', 'Rich', 'Poor', 'Cool', 'Hot', 'Fine', 'Great', 'Kind', 'Mean', 'Sure', 'Fair', 'Easy', 'Hard', 'True', 'Vast', 'Thin', 'Thick', 'Wide', 'Narrow', 'Young', 'Old', 'Fresh', 'Ripe', 'Sour', 'Sweet', 'Bitter', 'Salty', 'Spicy', 'Full', 'Empty', 'Close', 'Far', 'First', 'Last', 'Next', 'Past', 'Able', 'Odd', 'Even', 'Exact', 'Real', 'Fake', 'Full', 'Safe', 'Sick', 'Well', 'Sure', 'True', 'Wrong', 'Right'];
    const nouns = ['Sun', 'Moon', 'Star', 'Sky', 'Sea', 'Land', 'Air', 'Fire', 'Rock', 'Stone', 'Tree', 'Leaf', 'Root', 'Seed', 'Bird', 'Fish', 'Bug', 'Cat', 'Dog', 'Fox', 'Wolf', 'Bear', 'Lion', 'Cow', 'Pig', 'Goat', 'Duck', 'Owl', 'Bat', 'Egg', 'Ant', 'Bee', 'Fly', 'Man', 'Girl', 'Boy', 'Town', 'City', 'Room', 'Bed', 'Desk', 'Book', 'Pen', 'Ink', 'Art', 'Song', 'Game', 'Toy', 'Box', 'Key', 'Lock', 'Lamp', 'Car', 'Bus', 'Bike', 'Ship', 'Boat', 'Wind', 'Rain', 'Snow', 'Fog', 'Ice', 'Heat', 'Cold', 'Day', 'Night', 'Hour', 'Year', 'Life', 'Death', 'Mind', 'Soul', 'Body', 'Eye', 'Arm', 'Leg', 'Hand', 'Foot', 'Head', 'Face', 'Voice', 'Word', 'Name', 'Time', 'Hope', 'Love', 'Joy', 'Pain', 'Fear', 'War', 'Peace'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `Linky ${randomAdj} ${randomNoun}`;
  };

  useEffect(() => {
    dataFlowIntervalRef.current = setInterval(() => {
      const baseRate = 200;
      const variance = 100;
      const randomFactor = (Math.random() - 0.5) * 2;
      setDataFlowRate(Math.max(0, baseRate + Math.floor(randomFactor * variance)));
    }, 1000);
    return () => {
      if (dataFlowIntervalRef.current) {
        clearInterval(dataFlowIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
  const showTip = () => {
    const tips = [
      "🔐 Your messages are protected with end-to-end AES encryption.",
      "🛡️ Linky Anti Malware (LAM) automatically scans links and files.",
      "⚡ Ultra-fast and real-time messaging, fully encrypted.",
      "🕵️‍♂️ Your identity remains anonymous — always.",
      "📁 Files are securely transferred and checked instantly.",
      "🚫 Spam, phishing, and malware are automatically blocked by LAM.",
      "🗑️ All data is automatically deleted every 30 minutes for your privacy."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setAppStatus('active');
    setTipMessages(prev => [...prev, randomTip]);

    errorTimeoutRef.current = setTimeout(() => {
      setTipMessages(prev => prev.slice(1));
    }, 10000);
  };

  const tipInterval = setInterval(() => {
    if (Math.random() > 0.7) {
      showTip();
    }
  }, Math.random() * 30000 + 30000);

  return () => {
    clearInterval(tipInterval);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
  };
}, []);


  const fetchLinkPreview = useCallback(async (url: string): Promise<LinkPreview | undefined> => {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const getMetaContent = (name: string, property?: string) => {
        const element = doc.querySelector(`meta[name="${name}"]`) || doc.querySelector(`meta[property="${property || name}"]`);
        return element?.getAttribute('content') || undefined;
      };

      const title = doc.querySelector('title')?.textContent || getMetaContent('og:title') || undefined;
      const description = getMetaContent('description') || getMetaContent('og:description');
      const image = getMetaContent('og:image');

      return { url, title, description, image };

    } catch (error) {
      console.error("Error fetching link preview:", error);
      return { url };
    }
  }, []);

  const onDeleteMessage = useCallback((messageId: string, recipientId?: string) => {
  if (!socket) return;
  
  if (recipientId && recipientId !== 'public') {
    setPrivateMessages(prev => {
      const updatedMessages = (prev[recipientId] || []).filter(msg => msg.id !== messageId);
      return {
        ...prev,
        [recipientId]: updatedMessages
      };
    });
    socket.emit('delete private message', { messageId, recipientId });
  } else {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    socket.emit('delete message', { messageId });
  }
}, [socket]);

  const insertFormattedText = useCallback((prefix: string, suffix: string = '') => {
    if (!textInputRef.current) return;
    const textarea = textInputRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentValue = textarea.value;
    const selectedText = currentValue.substring(start, end);
    const newText = prefix + selectedText + suffix;

    setTextInput(
      currentValue.substring(0, start) + newText + currentValue.substring(end)
    );

    setTimeout(() => {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selectedText.length;
    }, 0);
  }, []);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setTextInput(prev => prev + emojiData.emoji);
  }, []);

  const handleGifClick = useCallback((gif: any) => {
    if (!socket || userName === 'Connecting...') return;
    
    const commonMessageProps = {
      id: uuidv4(),
      userId: socket.id,
      userName,
      timestamp: Date.now(),
      recipientId: currentChatRecipient?.id || 'public',
      userProfilePicture: myUserProfile || undefined,
      status: 'pending' as const,
    };

    const messageData: Omit<GifMessage, 'userId'> = {
      ...commonMessageProps,
      encryptedContent: encrypt(gif.images.original.url),
      type: 'gif',
      gifUrl: gif.images.original.url
    };

    if (messageData.recipientId && messageData.recipientId !== 'public') {
      setPrivateMessages(prev => ({
        ...prev,
        [messageData.recipientId]: [...(prev[messageData.recipientId] || []), messageData]
      }));
      socket.emit('private gif message', messageData, (response: { status: 'ok' | 'error', messageId: string }) => {
        if (response.status === 'ok') {
            setPrivateMessages(prev => ({
                ...prev,
                [messageData.recipientId]: (prev[messageData.recipientId] || []).map(msg => msg.id === response.messageId ? { ...msg, status: 'sent' } : msg)
            }));
        } else {
            console.error('Failed to send private GIF message:', response);
            setPrivateMessages(prev => ({
                ...prev,
                [messageData.recipientId]: (prev[messageData.recipientId] || []).map(msg => msg.id === response.messageId ? { ...msg, status: 'failed' } : msg)
            }));
        }
      });
    } else {
      setMessages(prev => [...prev, messageData]);
      socket.emit('gif message', messageData, (response: { status: 'ok' | 'error', messageId: string }) => {
        if (response.status === 'ok') {
            setMessages(prev => prev.map(msg => msg.id === response.messageId ? { ...msg, status: 'sent' } : msg));
        } else {
            console.error('Failed to send public GIF message:', response);
            setMessages(prev => prev.map(msg => msg.id === response.messageId ? { ...msg, status: 'failed' } : msg));
        }
      });
    }
    
    setShowGifPicker(false);
  }, [socket, userName, currentChatRecipient, myUserProfile]);

  const fetchGifs = useCallback((offset: number) => {
    if (!GIPHY_API_KEY) {
      console.warn("GIPHY_API_KEY is not set.");
      return;
    }
    const limit = 20;
    const offsetCalc = offset * limit;
    return gifSearchTerm.trim() === 'trending' ? giphyFetch.trending({ offset: offsetCalc, limit }) : giphyFetch.search(gifSearchTerm, { offset: offsetCalc, limit });
  }, [gifSearchTerm]);


  useEffect(() => {
    if (!socket || userOnlineEmitted.current) return;

    if (isConnected && userName !== 'Connecting...') {
      console.log('Registering user with socket...');
      socket.emit('register', { userId: socket.id, userName, profilePicture: userProfilePicture });
      userOnlineEmitted.current = true;
    }
  }, [socket, isConnected, userName, userProfilePicture]);

      const updateMessageProperty = useCallback((messageId: string, property: string, value: any) => {
        setMessages(prev =>
            prev.map(msg => (msg.id === messageId ? { ...msg, [property]: value } : msg))
        );
        setPrivateMessages(prev => {
            const newState = { ...prev };
            for (const userId in newState) {
                newState[userId] = newState[userId].map(msg =>
                    msg.id === messageId ? { ...msg, [property]: value } : msg
                );
            }
            return newState;
        });
    }, [setMessages, setPrivateMessages]);

    useEffect(() => {
        if (!socket) return;
        
        const handleNewMessage = (newMessage: Message, isPrivate = false) => {
          if (isPrivate) {
            setPrivateMessages(prev => {
              const chatPartnerId = newMessage.recipientId === socket.id ? newMessage.userId : newMessage.recipientId;
              if (chatPartnerId) {
                  const messagesForUser = prev[chatPartnerId] || [];
                  const isDuplicate = messagesForUser.some(msg => msg.id === newMessage.id);
                  if (isDuplicate) return prev;
                  
                  return {
                      ...prev,
                      [chatPartnerId]: [...messagesForUser, newMessage]
                  };
              }
              return prev;
            });
            if (privateMessageSound.current) {
              privateMessageSound.current.play();
            }
          } else {
            const isDuplicate = messages.some(msg => msg.id === newMessage.id);
            if (!isDuplicate) {
                setMessages(prev => [...prev, newMessage]);
                if (publicMessageSound.current) {
                  publicMessageSound.current.play();
                }
            }
          }
        };
    
        const handleUpdateMessage = (updatedMessage: Message, isPrivate = false) => {
          const updateMessageList = (prevMessages: Message[]): Message[] => {
            return prevMessages.map(msg =>
              msg.id === updatedMessage.id ? updatedMessage : msg
            );
          };
    
          if (isPrivate && updatedMessage.recipientId) {
            setPrivateMessages(prev => {
              const recipientId = updatedMessage.recipientId === socket.id ? updatedMessage.userId : updatedMessage.recipientId;
              if (recipientId) {
                  return {
                      ...prev,
                      [recipientId]: updateMessageList(prev[recipientId] || [])
                  };
              }
              return prev;
            });
          } else {
            setMessages(updateMessageList);
          }
        };
    
        socket.on('initial messages', (initialMessages: Message[]) => {
          console.log('Received initial messages:', initialMessages);
          setMessages(initialMessages);
        });
    
        socket.on('chat reset', () => {
          window.location.reload();
        });
        
        socket.on('private initial messages', ({ userId, messages: initialMessages }: { userId: string, messages: Message[] }) => {
          setPrivateMessages(prev => ({
            ...prev,
            [userId]: initialMessages
          }));
        });
    
        socket.on('chat message', (message: ChatMessage) => {
            setMessages(prev => {
                if (prev.some(msg => msg.id === message.id)) {
                    return prev;
                }
                return [...prev, { ...message, status: 'sent' }];
            });
        });
    
        socket.on('private message', (message: ChatMessage) => {
          setPrivateMessages(prev => {
            const recipientId = message.recipientId === socket.id ? message.userId : message.recipientId;
            const newMessages = [...(prev[recipientId] || []), { ...message, status: 'sent' }];
    
            if (prev[recipientId]?.some(msg => msg.id === message.id)) {
              return prev;
            }
    
            return {
              ...prev,
              [recipientId]: newMessages
            };
          });
        });
    
        socket.on('gif message', (msg: GifMessage) => {
          handleNewMessage(msg);
        });
    
        socket.on('private gif message', (msg: GifMessage) => {
          handleNewMessage(msg, true);
        });
        
        socket.on('file message', (msg: FileMessage) => {
            handleNewMessage(msg);
        });
    
        socket.on('private file message', (msg: FileMessage) => {
            handleNewMessage(msg, true);
        });
    
        socket.on('link message', (msg: LinkMessage) => {
          handleNewMessage(msg);
        });
        
        socket.on('private link message', (msg: LinkMessage) => {
          handleNewMessage(msg, true);
        });
    
        socket.on('online users', (users: OnlineUser[]) => {
          setOnlineUsers(users);
        });
        
        socket.on('typing', (userName: string, recipientId?: string) => {
          if (recipientId === socket.id || !recipientId) {
            setOnlineUsers(prev => prev.map(user =>
              user.userName === userName ? { ...user, isTyping: true } : user
            ));
          }
        });
    
        socket.on('stop typing', (userName: string, recipientId?: string) => {
          if (recipientId === socket.id || !recipientId) {
            setOnlineUsers(prev => prev.map(user =>
              user.userName === userName ? { ...user, isTyping: false } : user
            ));
          }
        });
    
        socket.on('reaction added', ({ messageId, emoji, userId, recipientId }: { messageId: string, emoji: string, userId: string, recipientId?: string }) => {
          if (recipientId) {
            setPrivateMessages(prev => {
              const chatPartnerId = recipientId === socket.id ? userId : recipientId;
              const updatedMessages = (prev[chatPartnerId] || []).map(msg => {
                if (msg.id === messageId) {
                  const reactions = msg.reactions || {};
                  const reaction = reactions[emoji] || { emoji, count: 0, users: [] };
                  if (!reaction.users.includes(userId)) {
                    reaction.users.push(userId);
                    reaction.count += 1;
                  }
                  return { ...msg, reactions: { ...reactions, [emoji]: reaction } };
                }
                return msg;
              });
              return { ...prev, [chatPartnerId]: updatedMessages };
            });
          } else {
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                const reactions = msg.reactions || {};
                const reaction = reactions[emoji] || { emoji, count: 0, users: [] };
                if (!reaction.users.includes(userId)) {
                  reaction.users.push(userId);
                  reaction.count += 1;
                }
                return { ...msg, reactions: { ...reactions, [emoji]: reaction } };
              }
              return msg;
            }));
          }
        });
    
        socket.on('reaction removed', ({ messageId, emoji, userId, recipientId }: { messageId: string, emoji: string, userId: string, recipientId?: string }) => {
          if (recipientId) {
            setPrivateMessages(prev => {
              const chatPartnerId = recipientId === socket.id ? userId : recipientId;
              const updatedMessages = (prev[chatPartnerId] || []).map(msg => {
                if (msg.id === messageId) {
                  const reactions = { ...msg.reactions };
                  if (reactions[emoji]) {
                    reactions[emoji].users = reactions[emoji].users.filter(uId => uId !== userId);
                    reactions[emoji].count -= 1;
                    if (reactions[emoji].count <= 0) {
                      delete reactions[emoji];
                    }
                  }
                  return { ...msg, reactions };
                }
                return msg;
              });
              return { ...prev, [chatPartnerId]: updatedMessages };
            });
          } else {
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                const reactions = { ...msg.reactions };
                if (reactions[emoji]) {
                  reactions[emoji].users = reactions[emoji].users.filter(uId => uId !== userId);
                  reactions[emoji].count -= 1;
                  if (reactions[emoji].count <= 0) {
                    delete reactions[emoji];
                  }
                }
                return { ...msg, reactions };
              }
              return msg;
            }));
          }
        });
    
        socket.on('file upload progress', ({ id, progress, recipientId, userId }: { id: string, progress: number, recipientId?: string, userId: string }) => {
          const isPrivate = !!recipientId && recipientId !== 'public';
          const updateMessageList = (prevMessages: Message[]): Message[] => {
            return prevMessages.map(msg => msg.id === id ? { ...msg, uploadProgress: progress } : msg);
          };
    
          if (isPrivate) {
            const chatPartnerId = recipientId === socket.id ? userId : recipientId;
            setPrivateMessages(prev => ({
              ...prev,
              [chatPartnerId]: updateMessageList(prev[chatPartnerId] || [])
            }));
          } else {
            setMessages(prev => updateMessageList(prev));
          }
        });
    
        socket.on('file upload complete', (finalMessage: FileMessage) => {
          console.log('File upload complete:', finalMessage);
          const { id, recipientId, userId } = finalMessage;
          
          const updateMessageList = (prevMessages: Message[]): Message[] => {
            return prevMessages.map(msg => msg.id === id ? finalMessage : msg);
          };
    
          if (recipientId && recipientId !== 'public') {
            const chatPartnerId = recipientId === socket.id ? userId : recipientId;
            setPrivateMessages(prev => ({
              ...prev,
              [chatPartnerId]: updateMessageList(prev[chatPartnerId] || [])
            }));
          } else {
            setMessages(prev => updateMessageList(prev));
          }
        });
    
        socket.on('nsfw result', ({ messageId, nsfwStatus }: { messageId: string, nsfwStatus: 'sfw' | 'nsfw' }) => {
            updateMessageProperty(messageId, 'nsfwStatus', nsfwStatus);
        });

        socket.on('spam result', ({ messageId, spamStatus }: { messageId: string, spamStatus: 'clean' | 'spam' }) => {
            updateMessageProperty(messageId, 'spamStatus', spamStatus);
        });
    
        return () => {
          socket.off('initial messages');
          socket.off('private initial messages');
          socket.off('chat message');
          socket.off('private message');
          socket.off('gif message');
          socket.off('private gif message');
          socket.off('file message');
          socket.off('private file message');
          socket.off('link message');
          socket.off('private link message');
          socket.off('online users');
          socket.off('typing');
          socket.off('stop typing');
          socket.off('reaction added');
          socket.off('reaction removed');
          socket.off('file upload progress');
          socket.off('file upload complete');
          socket.off('message deleted');
          socket.off('chat reset');
          socket.off('nsfw result');
          socket.off('spam result');
        };
      }, [socket, messages, updateMessageProperty]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedInput = textInput.trim();
    if (trimmedInput === '' || !socket || userName === 'Connecting...') return;
    
    const messageId = uuidv4();
    const currentInput = textInput;
    setTextInput('');
    
    const commonMessageProps = {
      id: messageId,
      userId: socket.id,
      userName,
      timestamp: Date.now(),
      recipientId: currentChatRecipient?.id || 'public',
      userProfilePicture: myUserProfile || undefined,
      status: 'pending' as const,
    };

    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const links = currentInput.match(linkRegex);

    if (links && links.length > 0) {
        const url = links[0];
        const preview = await fetchLinkPreview(url);
        const linkMessage: LinkMessage = {
            ...commonMessageProps,
            type: 'link',
            encryptedContent: encrypt(url),
            linkPreview: preview,
        };
        
        if (linkMessage.recipientId && linkMessage.recipientId !== 'public') {
          socket.emit('private link message', linkMessage, (response: { status: 'ok' | 'error', messageId: string }) => {
              if (response.status === 'ok') {
                  setPrivateMessages(prev => ({
                      ...prev,
                      [linkMessage.recipientId]: (prev[linkMessage.recipientId] || []).map(msg => msg.id === response.messageId ? { ...msg, status: 'sent' } : msg)
                  }));
              } else {
                  setPrivateMessages(prev => ({
                      ...prev,
                      [linkMessage.recipientId]: (prev[linkMessage.recipientId] || []).map(msg => msg.id === response.messageId ? { ...msg, status: 'failed' } : msg)
                  }));
              }
          });
        } else {
          socket.emit('link message', linkMessage, (response: { status: 'ok' | 'error', messageId: string }) => {
              if (response.status === 'ok') {
                  setMessages(prev => prev.map(msg => msg.id === response.messageId ? { ...msg, status: 'sent' } : msg));
              } else {
                  setMessages(prev => prev.map(msg => msg.id === response.messageId ? { ...msg, status: 'failed' } : msg));
              }
          });
        }

    } else {
      const messageData: Omit<ChatMessage, 'userId'> = {
        ...commonMessageProps,
        type: 'text',
        encryptedContent: encrypt(trimmedInput),
      };

      if (messageData.recipientId && messageData.recipientId !== 'public') {
        socket.emit('private message', messageData, (response: { status: 'ok' | 'error', messageId: string }) => {
            if (response.status === 'ok') {
                setPrivateMessages(prev => ({
                    ...prev,
                    [messageData.recipientId]: (prev[messageData.recipientId] || []).map(msg => msg.id === response.messageId ? { ...msg, status: 'sent' } : msg)
                }));
            } else {
                setPrivateMessages(prev => ({
                    ...prev,
                    [messageData.recipientId]: (prev[messageData.recipientId] || []).map(msg => msg.id === response.messageId ? { ...msg, status: 'failed' } : msg)
                }));
            }
        });
      } else {
        socket.emit('chat message', messageData, (response: { status: 'ok' | 'error', messageId: string }) => {
            if (response.status === 'ok') {
                setMessages(prev => prev.map(msg => msg.id === response.messageId ? { ...msg, status: 'sent' } : msg));
            } else {
                setMessages(prev => prev.map(msg => msg.id === response.messageId ? { ...msg, status: 'failed' } : msg));
            }
        });
      }
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop typing', currentChatRecipient?.id);
    setIsTyping(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    if (!socket || userName === 'Connecting...') return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', currentChatRecipient?.id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop typing', currentChatRecipient?.id);
    }, 3000);
  };

  const addReaction = useCallback((messageId: string, emoji: string, recipientId?: string) => {
    if (!socket) return;
    
    const isPrivate = !!recipientId && recipientId !== 'public';
    const emitEvent = isPrivate ? 'add private reaction' : 'add reaction';

    const updateMessages = (messages: Message[]): Message[] => {
      return messages.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || {};
          const reaction = reactions[emoji] || { emoji, count: 0, users: [] };

          if (reaction.users.includes(socket.id)) {
            reaction.users = reaction.users.filter(id => id !== socket.id);
            reaction.count -= 1;
            if (reaction.count <= 0) {
              delete reactions[emoji];
            } else {
              reactions[emoji] = reaction;
            }
          } else {
            reaction.users.push(socket.id);
            reaction.count += 1;
            reactions[emoji] = reaction;
          }
          return { ...msg, reactions: { ...reactions } };
        }
        return msg;
      });
    };

    if (isPrivate) {
      setPrivateMessages(prev => ({
        ...prev,
        [recipientId]: updateMessages(prev[recipientId] || []),
      }));
    } else {
      setMessages(updateMessages);
    }
    socket.emit(emitEvent, { messageId, emoji, recipientId });
  }, [socket]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || userName === 'Connecting...') return;

    const messageId = uuidv4();
    const isPrivate = !!currentChatRecipient;
    const CHUNK_SIZE = 1024 * 512;
    let offset = 0;

    const optimisticMessage: FileMessage = {
        id: messageId,
        userId: socket.id,
        userName,
        timestamp: Date.now(),
        recipientId: currentChatRecipient?.id || 'public',
        encryptedContent: encrypt(`Uploading ${file.name}...`),
        type: 'file',
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadProgress: 0,
        userProfilePicture: myUserProfile || undefined,
        status: 'pending',
    };

    if (isPrivate) {
        setPrivateMessages(prev => ({
            ...prev,
            [currentChatRecipient.id]: [...(prev[currentChatRecipient.id] || []), optimisticMessage]
        }));
    } else {
        setMessages(prev => [...prev, optimisticMessage]);
    }

    const sendChunk = (chunk: ArrayBuffer, isLast: boolean, uploadId: string) => {
        socket.emit('file chunk', {
            id: uploadId,
            chunk,
            isLast,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            recipientId: currentChatRecipient?.id || 'public',
            userName: userName,
            userProfilePicture: myUserProfile
        }, (response: { status: 'ok' | 'error' }) => {
            if (response.status === 'ok') {
                offset += chunk.byteLength;
                const progress = Math.min(100, (offset / file.size) * 100);
                
                const updateProgress = (messages: Message[]) => {
                    return messages.map(msg => msg.id === uploadId ? { ...msg, uploadProgress: progress } : msg);
                };

                if (isPrivate) {
                    setPrivateMessages(prev => ({
                        ...prev,
                        [currentChatRecipient.id]: updateProgress(prev[currentChatRecipient.id] || [])
                    }));
                } else {
                    setMessages(prev => updateProgress(prev));
                }
                
                socket.emit('file upload progress', { id: uploadId, progress: progress, recipientId: currentChatRecipient?.id, userId: socket.id });
            } else {
                console.error(`Error sending chunk for file ${uploadId}`);
                if (isPrivate) {
                    setPrivateMessages(prev => ({
                        ...prev,
                        [currentChatRecipient.id]: (prev[currentChatRecipient.id] || []).map(msg => msg.id === uploadId ? { ...msg, status: 'failed', uploadProgress: 100 } : msg)
                    }));
                } else {
                    setMessages(prev => (prev.map(msg => msg.id === uploadId ? { ...msg, status: 'failed', uploadProgress: 100 } : msg)));
                }
            }
        });
    };

    const reader = new FileReader();
    reader.onload = (e) => {
        if (!e.target?.result) return;
        const chunk = e.target.result as ArrayBuffer;
        const isLast = (offset + chunk.byteLength) >= file.size;
        sendChunk(chunk, isLast, messageId);
        
        if (!isLast) {
            readNextChunk();
        }
    };
    
    const readNextChunk = () => {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        if (slice.size > 0) {
            reader.readAsArrayBuffer(slice);
        }
    };

    readNextChunk();
  };


  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserSearchTerm(e.target.value);
  };

  const filteredOnlineUsers = onlineUsers.filter(user =>
    user.id !== socket?.id && user.userName.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const getChatMessages = () => {
    if (currentChatRecipient) {
      return privateMessages[currentChatRecipient.id] || [];
    }
    return messages;
  };
  
  const getTypingUsers = () => {
    const typingUsers = onlineUsers.filter(user => user.isTyping && user.id !== socket?.id);
    if (typingUsers.length === 0) return '';

    if (currentChatRecipient) {
      const isRecipientTyping = typingUsers.find(user => user.id === currentChatRecipient.id);
      return isRecipientTyping ? `${isRecipientTyping.userName} is typing...` : '';
    }

    const userNames = typingUsers.map(user => user.userName);
    if (userNames.length === 1) return `${userNames[0]} is typing...`;
    if (userNames.length === 2) return `${userNames[0]} and ${userNames[1]} are typing...`;
    return `${userNames.length} people are typing...`;
  };

  const onUserNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('linkychain_username', newName);
    if (socket) {
      socket.emit('update user', { userName: newName, profilePicture: userProfilePicture });
    }
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUserProfilePicture(base64String);
        localStorage.setItem('linkychain_profile_picture', base64String);
        if (socket) {
          socket.emit('update user', { userName, profilePicture: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderMessageList = () => {
    const chatMessages = getChatMessages();
    return chatMessages.map((msg) => {
      const isSelf = msg.userId === socket?.id;
      return <MessageBubble
        key={msg.id}
        message={msg}
        isSelf={isSelf}
        socketId={socket?.id || ''}
        onAddReaction={addReaction}
        onlineUsers={onlineUsers}
        onDeleteMessage={onDeleteMessage}
        
      />;
    });
  };

  const [placeholderText, setPlaceholderText] = useState('');

    const placeholders = [
    "Send a message to the world here...",
    "What's on your mind? Share your thoughts...",
    "Type your message, gifs, and memes...",
    "Start a conversation with 'Hello, world!'",
    "Share your latest idea... ✨",
    "Drop a fun fact or a favorite quote. 💡",
    "Feeling creative? Start typing! ✍️",
    "What's the tea? Spill it here... ☕",
    "Ready to chat? Let's go! 🚀",
    "Hey there! What's new? 👋",
    "Let the good times roll... 🎉",
    "Don't be shy, say something! 😊",
    "Planning your next big project? 📈",
    "What's on your playlist today? 🎧",
    "Spam some of your favorite emojis! 😂",
    "Which game are you playing right now? 🎮",
    "Share a pic of your pet! 🐶🐱",
    "Looking for some help with a bug? 🐛",
    "Have a question? Ask away! ❓",
    "Who's online? Let's team up! 🤝",
    "Send a random GIF to brighten someone's day. 🎁",
    "What's the best movie you've seen recently? 🎬",
    "Feeling inspired? Tell us why! 💖",
    "Just a friendly reminder: you're awesome! 👍",
    "Share a link to something interesting. 🔗",
    "What's for lunch? 🍔",
    "Looking for some new music? 🎶",
    "Got any weekend plans? 🥳"
];

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * placeholders.length);
        setPlaceholderText(placeholders[randomIndex]);
    }, []);

  return (
    <>
      <Head>
        <title>LinkyChain Chat - Secure & Ephemeral Messaging</title>
        <meta name="description" content="LinkyChain Chat offers a secure, ephemeral, and private messaging experience. All global messages are temporary, and private chats are never stored. Enjoy real-time, encrypted communication." />
        <meta name="keywords" content="chat, secure chat, ephemeral messages, private chat, encrypted chat, real-time communication, data privacy, instant messaging" />
        <meta name="author" content="Thomas Garau" />

        {/* Open Graph / Facebook / LinkedIn */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://linkychain.neko-cli.com/" />
        <meta property="og:title" content="LinkyChain Chat - Secure & Ephemeral Messaging" />
        <meta property="og:description" content="LinkyChain Chat offers a secure, ephemeral, and private messaging experience. All global messages are temporary, and private chats are never stored. Enjoy real-time, encrypted communication." />
        <meta property="og:image" content="https://i.imgur.com/jbAa7vz.png" />
        <meta property="og:image:alt" content="LinkyChain Chat Logo - Secure Messaging" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://linkychain.neko-cli.com/" />
        <meta name="twitter:title" content="LinkyChain Chat - Secure & Ephemeral Messaging" />
        <meta name="twitter:description" content="LinkyChain Chat offers a secure, ephemeral, and private messaging experience. All global messages are temporary, and private chats are never stored. Enjoy real-time, encrypted communication." />
        <meta name="twitter:image" content="https://i.imgur.com/jbAa7vz.png" />
        <meta name="twitter:image:alt" content="LinkyChain Chat Logo - Secure Messaging" />
        <meta name="twitter:creator" content="@StrayVibes" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://linkychain.neko-cli.com/" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen bg-linkychain-dark-300 text-linkychain-gray-100">
        <aside className="w-64 bg-linkychain-dark-400 flex flex-col p-4 ">
          <div className="flex items-center mb-6">
            <h1 className="text-xl font-bold text-linkychain-gray-100 flex-1 gradient-text">💬 LinkyChain Chat</h1>
            <FontAwesomeIcon icon={faLink} className={`text-xl ${isConnected ? 'text-linkychain-green-500' : 'text-linkychain-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
          </div>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-linkychain-gray-200">Online Users</h2>
            <div className="text-xs font-semibold text-linkychain-gray-200 flex items-center gap-1">
              <FontAwesomeIcon icon={faCircle} className={`text-sm ${isConnected ? 'text-linkychain-green-500' : 'text-linkychain-red-500'}`} />
              {onlineUsers.length}
            </div>
          </div>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full bg-linkychain-dark-200 text-linkychain-gray-100 px-4 pl-10 py-2 rounded-lg text-sm transition-colors duration-200 focus:outline-none focus:ring-0 focus:border-transparent
"
              value={userSearchTerm}
              onChange={handleUserSearch}
            />
          </div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <ul className="space-y-1">
              <li
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors duration-150
                  ${!currentChatRecipient ? 'bg-linkychain-dark-200 text-linkychain-gray-100' : 'hover:bg-linkychain-dark-200 text-linkychain-gray-200'}`}
                onClick={() => {
                  setCurrentChatRecipient(null);
                  if (socket) {
                    sendRecentMessages(socket);
                  }
                }}
              >
                <div className="w-8 h-8 rounded-full bg-linkychain-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  <FontAwesomeIcon icon={faGlobe} />
                </div>
                <span className="font-semibold text-sm">World Chat</span>
              </li>
              {filteredOnlineUsers.map((user) => (
                <li
                  key={user.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors duration-150
                    ${currentChatRecipient?.id === user.id ? 'bg-linkychain-dark-200 text-linkychain-gray-100' : 'hover:bg-linkychain-dark-200 text-linkychain-gray-200'}`}
                  onClick={() => {
                    setCurrentChatRecipient(user);
                    if (socket) {
                      socket.emit('request private messages', user.id);
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold relative overflow-hidden bg-linkychain-blue-500">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={`${user.userName}'s profile`} className="w-full h-full object-cover" />
                    ) : (
                      <FontAwesomeIcon icon={faUser} className="text-xl" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {user.userName}
                    </span>
                    {user.isTyping && <span className="text-xs text-linkychain-blue-500 truncate">typing...</span>}
                  </div>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto flex items-center justify-between p-2 rounded-lg bg-linkychain-dark-300">
            <div className="flex items-center gap-3 relative group">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden bg-linkychain-blue-500 cursor-pointer"
                onClick={() => setShowProfileMenu(true)}
                title="Open Profile Settings"
              >
                {myUserProfile ? (
                  <img src={myUserProfile} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon={faUser} className="text-xl" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm block truncate text-white">
                  {userName}
                </span>
                <span className={`text-xs flex items-center gap-1 ${isConnected ? 'text-linkychain-green-500' : 'text-linkychain-red-500'}`}>
                  <FontAwesomeIcon icon={faCircle} className="text-xs" />
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              {showProfileMenu && (
                <div ref={profileMenuRef} className="absolute bottom-full left-0 mb-2 w-56 bg-linkychain-dark-200 rounded-md  border border-linkychain-dark-100 p-2 animate-scale-in origin-bottom-left z-50">
                  <div className="p-2 border-b border-linkychain-dark-100 mb-2">
                    <label className="text-xs font-semibold text-linkychain-gray-200">Username</label>
                    <label className="w-full mt-1 bg-linkychain-dark-100 text-linkychain-gray-100 px-2 py-1 rounded-md text-sm"><br></br>{userName}</label>
                  </div>
                  <div className="p-2">
                    <label className="text-xs font-semibold text-linkychain-gray-200">Profile Picture</label>
                    <div className="flex items-center mt-2">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl text-white relative overflow-hidden bg-linkychain-blue-500 cursor-pointer"
                        onClick={() => userProfilePictureInputRef.current?.click()}
                        title="Change Profile Picture"
                      >
                        {myUserProfile ? (
                          <img src={myUserProfile} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <FontAwesomeIcon icon={faUpload} />
                        )}
                      </div>
                      <button
                        onClick={() => userProfilePictureInputRef.current?.click()}
                        className="ml-3 app-btn-secondary text-sm px-3 py-1 rounded-md"
                      >
                        Upload
                      </button>
                      <input
                        type="file"
                        ref={userProfilePictureInputRef}
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowProfileMenu(true)}
              className="m-5 w-8 h-8 flex items-center justify-center rounded-md text-linkychain-gray-200 hover:bg-linkychain-dark-200 transition-colors"
              title="User Settings"
            >
              <FontAwesomeIcon icon={faCog} />
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="bg-linkychain-dark-400 p-4  flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={currentChatRecipient ? faLock : faGlobe} className="text-linkychain-gray-200" />
                {currentChatRecipient ? currentChatRecipient.userName : 'World Chat'}
              </h2>
              <ChannelDescription currentRecipient={currentChatRecipient} />
            </div>
            <div className="flex items-center gap-4 text-sm text-linkychain-gray-200">
              <div className="flex items-center gap-2" title="Chat Destroy">
                <FontAwesomeIcon icon={faBomb} className="text-linkychain-red-500" />
                <span className="font-semibold">{formatCountdown(countdown)}</span>
              </div>
              <div className="flex items-center gap-2" title="Data Flow Rate">
                <FontAwesomeIcon icon={faMeteor} className="text-linkychain-blue-500" />
                <span>{dataFlowRate} kb/s</span>
              </div>
              <div className="flex items-center gap-2" title="『Linky∴Anti∵Malware』 (Secured 🔐)">
                <FontAwesomeIcon icon={faShieldVirus} className="text-linkychain-green-500" />
                <span>(LAM)</span>
              </div>
              <a href="https://github.com/LinkyChain/LinkyChain-Chat" className="flex items-center gap-2" title="Project Source Code" target="_blank">
  <FontAwesomeIcon icon={faCat} className="text-linkychain-yellow-767" />
  <span>Source Code</span>
</a>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col-reverse">
            <ul className="space-y-4 pt-4" ref={messagesEndRef}>
              {renderMessageList()}
            </ul>
          </div>
          
          <footer className="bg-linkychain-dark-400 p-4  mt-auto relative">
            <div className="min-h-8 text-linkychain-blue-500 text-sm font-semibold italic mb-2">
              {getTypingUsers()}
            </div>
            {showGifPicker && (
              <div ref={gifPickerRef} className="absolute bottom-full left-0 right-0 mb-4 bg-linkychain-dark-200 border border-linkychain-dark-100 rounded-lg  p-4 animate-slide-in-up origin-bottom">
                <div className="flex justify-between items-center mb-2">
                  <input
                    type="text"
                    value={gifSearchTerm === 'trending' ? '' : gifSearchTerm}
                    onChange={(e) => {
                      setGifSearchTerm(e.target.value || 'trending');
                      setIsSearchingGifs(true);
                      setTimeout(() => setIsSearchingGifs(false), 500);
                    }}
                    placeholder="Search GIFs..."
                    className="flex-1 bg-linkychain-dark-100 text-linkychain-gray-100 px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-0 focus:border-transparent
"
                  />
                  <button
                    onClick={() => setShowGifPicker(false)}
                    className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-linkychain-gray-200 hover:bg-linkychain-dark-100 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimesCircle} />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {!isSearchingGifs && (
                    <Grid
                      key={gifSearchTerm}
                      onGifClick={handleGifClick}
                      fetchGifs={fetchGifs}
                      width={600}
                      columns={3}
                      gutter={gifGutter}
                      noLink={true}
                    />
                  )}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 bg-linkychain-dark-100 rounded-lg">
  <div className="flex-grow bg-linkychain-dark-200 rounded-lg overflow-hidden border border-linkychain-dark-100 duration-200">
    <div className="items-center gap-1 p-2 border-b border-linkychain-dark-100">
      <button
        type="button"
        onClick={() => insertFormattedText('**', '**')}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="Bold (Ctrl+B)"
      >
        <FontAwesomeIcon icon={faBold} />
      </button>
      <button
        type="button"
        onClick={() => insertFormattedText('*', '*')}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="Italic (Ctrl+I)"
      >
        <FontAwesomeIcon icon={faItalic} />
      </button>
      <button
        type="button"
        onClick={() => insertFormattedText('__', '__')}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="Underline (Ctrl+U)"
      >
        <FontAwesomeIcon icon={faUnderline} />
      </button>
      <button
        type="button"
        onClick={() => insertFormattedText('``` ', '```')}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="Code Block (Ctrl+Alt+C)"
      >
        <FontAwesomeIcon icon={faFileCode} />
      </button>
      <button
        type="button"
        onClick={() => insertFormattedText('[text here](url here)', '')}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="Insert Link (Ctrl+K)"
      >
        <FontAwesomeIcon icon={faLink} />
      </button>
      <button
        type="button"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="Emoji Picker (Ctrl+.)"
      >
        <FontAwesomeIcon icon={faSmile} />
      </button>
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-4 z-50 animate-slide-in-up-emoji">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={EmojiTheme.DARK}
            width={400}
            height={450}
            searchDisabled={false}
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setShowGifPicker(prev => !prev);
          setShowEmojiPicker(false);
        }}
        className="app-btn-text-format text-sm text-linkychain-gray-300 hover:text-white transition-colors duration-200"
        title="GIFs (Ctrl+G)"
      >
        <FontAwesomeIcon icon={faImage} />
      </button>
    </div>
    <div className="flex items-end">
      <div className="flex items-end">
  <div className="flex items-center p-2">
    <input
      type="file"
      id="file-upload"
      className="hidden"
      onChange={handleFileSelect}
    />
    <label
      htmlFor="file-upload"
      className="app-btn-text-format cursor-pointer text-linkychain-gray-300 hover:text-white transition-colors duration-200"
      title="Upload File"
    >
      <FontAwesomeIcon icon={faPaperclip} />
    </label>
  </div>
  <div className="relative flex-1 flex items-end h-full min-w-[1300px]">
  {textInput.length === 0 && (
    <div className="absolute top-0 left-0 bottom-0 flex items-center pl-4 pr-2 text-linkychain-gray-300 pointer-events-none">
      <FontAwesomeIcon icon={faKeyboard} className="mr-2" />
      <span className="truncate">{placeholderText}</span>
    </div>
  )}

  <textarea
    ref={textInputRef}
    value={textInput}
    onChange={handleTyping}
    onKeyDown={(e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
      if (isCtrlOrCmd && e.key === 'b') {
        e.preventDefault();
        insertFormattedText('**', '**');
      }
      if (isCtrlOrCmd && e.key === 'i') {
        e.preventDefault();
        insertFormattedText('*', '*');
      }
      if (isCtrlOrCmd && e.key === 'u') {
        e.preventDefault();
        insertFormattedText('__', '__');
      }
      if (isCtrlOrCmd && e.key === 'k') {
        e.preventDefault();
        insertFormattedText('[text here](url here)', '');
      }
      if (isCtrlOrCmd && e.altKey && e.key === 'c') {
        e.preventDefault();
        insertFormattedText('``` ', '```');
      }
      if (isCtrlOrCmd && e.key === '.') {
        e.preventDefault();
        setShowEmojiPicker(prev => !prev);
        setShowGifPicker(false);
      }
      if (isCtrlOrCmd && e.key === 'g') {
        e.preventDefault();
        setShowGifPicker(prev => !prev);
        setShowEmojiPicker(false);
      }
    }}
    className="w-full bg-linkychain-dark-100 text-linkychain-gray-100 px-4 py-3 rounded-lg text-sm resize-none transition-all duration-200 custom-scrollbar-textarea focus:outline-none focus:ring-0 focus:border-transparent"
    placeholder=""
    rows={1}
    style={{ maxHeight: '200px' }}
  />
</div>
</div>
      
    </div>
  </div>
  <button
  type="submit"
  className="h-10 w-10 flex-shrink-0 flex items-center justify-center text-linkychain-gray-200 hover:text-white transition-colors duration-200"
>
  <FontAwesomeIcon icon={faPaperPlane} />
</button>
</form>
          </footer>
        </main>
      </div>
      {errorMessages.length > 0 && (
        <div className="absolute top-4 right-4 z-50 space-y-2">
          {errorMessages.map((msg, index) => (
            <div key={index} className="bg-linkychain-blue-757 text-white text-sm p-3 rounded-lg  animate-fade-in-right">
              <FontAwesomeIcon icon={faCircleInfo} className="mr-2" />
              {msg}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const sendRecentMessages = async (socket: Socket) => {
    try {
        socket.emit('request initial messages');
    } catch (error) {
        console.error('Error requesting initial messages:', error);
    }
};

export default function MyApp({ Component, pageProps }: { Component: React.ElementType, pageProps: any }) {
  return (
    <ClickSpark
  sparkColor='#fff'
  sparkSize={10}
  sparkRadius={15}
  sparkCount={8}
  duration={400}>
<SocketProvider>
      <HomePageContent />
    </SocketProvider>
</ClickSpark>
  );
}
