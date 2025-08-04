/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const CryptoJS = require('crypto-js');
const mime = require('mime-types');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 4723;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkychain_chat';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const MessageSchema = new mongoose.Schema({
    id: String,
    userId: String,
    userName: String,
    recipientId: { type: String, required: false },
    type: String,
    encryptedContent: String,
    fileName: { type: String, required: false },
    fileType: { type: String, required: false },
    fileSize: { type: Number, required: false },
    filePath: { type: String, required: false },
    scanStatus: { type: String, default: 'pending' },
    nsfwStatus: { type: String, default: 'pending' },
    spamStatus: { type: String, default: 'pending' },
    linkPreview: { type: Object, required: false },
    gifUrl: { type: String, required: false },
    timestamp: { type: Number, default: Date.now },
    reactions: {
        type: Map,
        of: {
            emoji: String,
            count: Number,
            users: [String],
        },
        required: false
    },
    userProfilePicture: { type: String, required: false },
});

const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

const ENCRYPTION_SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY || 'your-super-secret-key-12345';
const encrypt = (text) => CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET_KEY).toString();

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

let io;

async function deleteUploadsFolder() {
    try {
        const files = await fs.readdir(uploadsDir);
        const deletePromises = files.map(file => {
            const filePath = path.join(uploadsDir, file);
            return fs.rm(filePath, { recursive: true, force: true });
        });
        await Promise.all(deletePromises);
        console.log(`[${new Date().toISOString()}] Successfully cleared uploads folder: ${uploadsDir}`);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`[${new Date().toISOString()}] Uploads folder not found, skipping delete.`);
        } else {
            console.error(`[${new Date().toISOString()}] Error clearing uploads folder:`, err);
        }
    }
}

async function dropDatabase() {
    try {
        console.log(`[${new Date().toISOString()}] Attempting to drop database: ${mongoose.connection.name}`);
        await mongoose.connection.db.dropDatabase();
        console.log(`[${new Date().toISOString()}] Successfully dropped database: ${mongoose.connection.name}`);

        await deleteUploadsFolder();

        if (io) {
            io.emit('server reload');
            console.log(`[${new Date().toISOString()}] Emitted 'server reload' event to all clients.`);
        }

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error dropping database or deleting files:`, err);
    }
}

async function analyzeContentForNsfw(content) {
    console.log(`[${new Date().toISOString()}] NSFW analysis for content: ${content}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const isNsfw = Math.random() < 0.1;
    const result = isNsfw ? 'nsfw' : 'sfw';
    console.log(`[${new Date().toISOString()}] NSFW analysis completed. Result: ${result}`);
    return result;
}

async function checkForSpam(content) {
    console.log(`[${new Date().toISOString()}] Spam analysis for content: ${content}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const isSpam = Math.random() < 0.05;
    const result = isSpam ? 'spam' : 'clean';
    console.log(`[${new Date().toISOString()}] Spam analysis completed. Result: ${result}`);
    return result;
}

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        const parsedUrl = parse(req.url, true);
        const { pathname } = parsedUrl;

        if (pathname.startsWith('/download/')) {
            const fileId = pathname.substring('/download/'.length);

            try {
                const message = await Message.findOne({ id: fileId });

                if (!message) {
                    console.warn(`[Download] File message not found in DB for ID: ${fileId}`);
                    res.statusCode = 404;
                    res.end('File not found');
                    return;
                }

                if (!message.filePath) {
                    console.error(`[Download] Message found but no filePath for ID: ${fileId}`);
                    res.statusCode = 404;
                    res.end('File path not defined');
                    return;
                }

                const filePath = path.join(uploadsDir, message.filePath);

                try {
                    await fs.access(filePath);
                } catch (err) {
                    console.error(`[Download] File not found on disk for ID: ${fileId}, path: ${filePath}`);
                    res.statusCode = 404;
                    res.end('File not found on disk');
                    return;
                }

                const mimeType = mime.lookup(message.fileName) || 'application/octet-stream';
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(message.fileName)}"`);

                const fileStream = require('fs').createReadStream(filePath);

                fileStream.on('error', (err) => {
                    console.error(`[Download] Error streaming file ${fileId}:`, err);
                    res.statusCode = 500;
                    res.end('Server error during file stream');
                });

                fileStream.pipe(res);

            } catch (err) {
                console.error(`[Download] Error serving file ${fileId}:`, err);
                res.statusCode = 500;
                res.end('Server error');
            }
            return;
        }

        handle(req, res, parsedUrl);
    });

    let nextResetTimestamp = Date.now() + 30 * 60 * 1000;

    if (process.env.NODE_ENV !== 'production') {
        setInterval(async () => {
            await dropDatabase();
            nextResetTimestamp = Date.now() + 30 * 60 * 1000;
            if (io) {
                const remainingTime = Math.max(0, Math.floor((nextResetTimestamp - Date.now()) / 1000));
                io.emit('countdown update', remainingTime);
            }
        }, 30 * 60 * 1000);
        console.log('Database drop and file cleanup task scheduled to run every 30 minutes in a non-production environment.');

        setInterval(() => {
            const remainingTime = Math.max(0, Math.floor((nextResetTimestamp - Date.now()) / 1000));
            if (io) io.emit('countdown update', remainingTime);
        }, 1000);
    }
    
    io = new Server(server);
    const users = {};
    const fileChunks = {};
    const fileUploads = {};

    const sendRecentMessages = async (socket) => {
        try {
            const initialMessages = await Message.find({ recipientId: { $in: [null, undefined, 'public'] } })
                .sort({ timestamp: 1 })
                .limit(100);
            socket.emit('initial messages', initialMessages);
        } catch (error) {
            console.error('Error fetching initial messages from MongoDB:', error);
            socket.emit('initial messages', []);
        }
    };

    const sendPrivateMessages = async (socket, recipientId) => {
        try {
            const messages = await Message.find({
                $or: [
                    { userId: socket.id, recipientId: recipientId },
                    { userId: recipientId, recipientId: socket.id },
                ]
            }).sort({ timestamp: 1 }).limit(100);
            socket.emit('private initial messages', { userId: recipientId, messages });
        } catch (error) {
            console.error('Error fetching private messages from MongoDB:', error);
            socket.emit('private initial messages', { userId: recipientId, messages: [] });
        }
    };


    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('server reload', () => {
            console.log('Received server reload request from client, ignoring on server.');
        });

        socket.on('register', async ({ userId, userName, profilePicture }) => {
            if (process.env.NODE_ENV !== 'production') {
                const remainingTime = Math.max(0, Math.floor((nextResetTimestamp - Date.now()) / 1000));
                socket.emit('countdown update', remainingTime);
            }

            if (!users[userId]) {
                const userExists = Object.values(users).some(user => user.userName === userName);
                if (userExists) {
                    let newUserName = `${userName}#${Math.floor(Math.random() * 1000)}`;
                    users[userId] = { id: userId, userName: newUserName, isTyping: false, profilePicture };
                } else {
                    users[userId] = { id: userId, userName, isTyping: false, profilePicture };
                }
            } else {
                users[userId].userName = userName;
                users[userId].profilePicture = profilePicture;
            }

            console.log(`User registered: ${users[userId].userName} (${userId})`);
            io.emit('online users', Object.values(users));
            sendRecentMessages(socket);
        });

        socket.on('request initial messages', () => {
            sendRecentMessages(socket);
        });

        socket.on('request private messages', (recipientId) => {
            sendPrivateMessages(socket, recipientId);
        });

        socket.on('update user', ({ userName, profilePicture }) => {
            if (users[socket.id]) {
                users[socket.id].userName = userName;
                users[socket.id].profilePicture = profilePicture;
                io.emit('online users', Object.values(users));
            }
        });


        socket.on('chat message', async (msg, callback) => {
    try {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = msg.encryptedContent.match(urlRegex);
        const decryptedContent = CryptoJS.AES.decrypt(msg.encryptedContent, ENCRYPTION_SECRET_KEY).toString(CryptoJS.enc.Utf8);
        
        const message = new Message({ ...msg, status: 'sent', scanStatus: 'pending', nsfwStatus: 'pending', spamStatus: 'pending' });
        await message.save();
        io.emit('chat message', message.toObject());
        
        const promises = [];
        promises.push(analyzeContentForNsfw(decryptedContent).then(result => ({ type: 'nsfw', status: result })));
        promises.push(checkForSpam(decryptedContent).then(result => ({ type: 'spam', status: result })));

        if (links) {
            promises.push(scanLinkWithVirusTotal(links[0]).then(result => ({ type: 'scan', status: result })));
        } else {
            promises.push(Promise.resolve({ type: 'scan', status: 'clean' }));
        }

        const results = await Promise.all(promises);

        const updateData = {};
        results.forEach(res => {
            if (res.type === 'scan') updateData.scanStatus = res.status;
            if (res.type === 'nsfw') updateData.nsfwStatus = res.status;
            if (res.type === 'spam') updateData.spamStatus = res.status;
        });

        const updatedMessage = await Message.findOneAndUpdate(
            { id: msg.id },
            { $set: updateData },
            { new: true }
        );

        if (updatedMessage) {
            io.emit('scan result', { messageId: msg.id, scanStatus: updatedMessage.scanStatus });
            io.emit('nsfw result', { messageId: msg.id, nsfwStatus: updatedMessage.nsfwStatus });
            io.emit('spam result', { messageId: msg.id, spamStatus: updatedMessage.spamStatus });
        }

        callback({ status: 'ok', messageId: msg.id });
    } catch (err) {
        console.error('Error saving message:', err);
        callback({ status: 'error', messageId: msg.id });
    }
});

        socket.on('private message', async (msg, callback) => {
    try {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = msg.encryptedContent.match(urlRegex);
        const decryptedContent = CryptoJS.AES.decrypt(msg.encryptedContent, ENCRYPTION_SECRET_KEY).toString(CryptoJS.enc.Utf8);
        
        const message = new Message({ ...msg, status: 'sent', scanStatus: 'pending', nsfwStatus: 'pending', spamStatus: 'pending' });
        await message.save();
        io.to(msg.recipientId).emit('private message', message.toObject());
        io.to(msg.userId).emit('private message', message.toObject());
        
        const promises = [];
        promises.push(analyzeContentForNsfw(decryptedContent).then(result => ({ type: 'nsfw', status: result })));
        promises.push(checkForSpam(decryptedContent).then(result => ({ type: 'spam', status: result })));

        if (links) {
            promises.push(scanLinkWithVirusTotal(links[0]).then(result => ({ type: 'scan', status: result })));
        } else {
            promises.push(Promise.resolve({ type: 'scan', status: 'clean' }));
        }

        const results = await Promise.all(promises);

        const updateData = {};
        results.forEach(res => {
            if (res.type === 'scan') updateData.scanStatus = res.status;
            if (res.type === 'nsfw') updateData.nsfwStatus = res.status;
            if (res.type === 'spam') updateData.spamStatus = res.status;
        });

        const updatedMessage = await Message.findOneAndUpdate(
            { id: msg.id },
            { $set: updateData },
            { new: true }
        );

        if (updatedMessage) {
            io.to(msg.recipientId).emit('scan result', { messageId: msg.id, scanStatus: updatedMessage.scanStatus });
            io.to(msg.userId).emit('scan result', { messageId: msg.id, scanStatus: updatedMessage.scanStatus });
            io.to(msg.recipientId).emit('nsfw result', { messageId: msg.id, nsfwStatus: updatedMessage.nsfwStatus });
            io.to(msg.userId).emit('nsfw result', { messageId: msg.id, nsfwStatus: updatedMessage.nsfwStatus });
            io.to(msg.recipientId).emit('spam result', { messageId: msg.id, spamStatus: updatedMessage.spamStatus });
            io.to(msg.userId).emit('spam result', { messageId: msg.id, spamStatus: updatedMessage.spamStatus });
        }

        callback({ status: 'ok', messageId: msg.id });
    } catch (err) {
        console.error('Error saving message:', err);
        callback({ status: 'error', messageId: msg.id });
    }
});

        socket.on('gif message', async (msg, callback) => {
            try {
                const message = new Message({ ...msg, status: 'sent' });
                await message.save();
                io.emit('gif message', message.toObject());
                callback({ status: 'ok', messageId: msg.id });
            } catch (err) {
                console.error('Error saving gif message:', err);
                callback({ status: 'error', messageId: msg.id });
            }
        });

        socket.on('private gif message', async (msg, callback) => {
            try {
                const message = new Message({ ...msg, status: 'sent' });
                await message.save();
                io.to(msg.recipientId).emit('private gif message', message.toObject());
                io.to(msg.userId).emit('private gif message', message.toObject());
                callback({ status: 'ok', messageId: msg.id });
            } catch (err) {
                console.error('Error saving private gif message:', err);
                callback({ status: 'error', messageId: msg.id });
            }
        });

        socket.on('link message', async (msg, callback) => {
            try {
                const message = new Message({ ...msg, status: 'sent' });
                await message.save();
                io.emit('link message', message.toObject());
                callback({ status: 'ok', messageId: msg.id });
            } catch (err) {
                console.error('Error saving link message:', err);
                callback({ status: 'error', messageId: msg.id });
            }
        });

        socket.on('private link message', async (msg, callback) => {
            try {
                const message = new Message({ ...msg, status: 'sent' });
                await message.save();
                io.to(msg.recipientId).emit('private link message', message.toObject());
                io.to(msg.userId).emit('private link message', message.toObject());
                callback({ status: 'ok', messageId: msg.id });
            } catch (err) {
                console.error('Error saving private link message:', err);
                callback({ status: 'error', messageId: msg.id });
            }
        });

        socket.on('typing', (recipientId) => {
            if (users[socket.id]) {
                users[socket.id].isTyping = true;
                if (recipientId) {
                    io.to(recipientId).emit('typing', users[socket.id].userName, recipientId);
                    io.to(socket.id).emit('typing', users[socket.id].userName, recipientId);
                } else {
                    socket.broadcast.emit('typing', users[socket.id].userName);
                }
            }
        });

        socket.on('stop typing', (recipientId) => {
            if (users[socket.id]) {
                users[socket.id].isTyping = false;
                if (recipientId) {
                    io.to(recipientId).emit('stop typing', users[socket.id].userName, recipientId);
                    io.to(socket.id).emit('stop typing', users[socket.id].userName, recipientId);
                } else {
                    socket.broadcast.emit('stop typing', users[socket.id].userName);
                }
            }
        });

        socket.on('add reaction', async ({ messageId, emoji, recipientId }) => {
            const message = await Message.findOne({ id: messageId });
            if (message) {
                const reactions = message.reactions || {};
                const reaction = reactions[emoji] || { emoji, count: 0, users: [] };

                const userId = socket.id;

                if (reaction.users.includes(userId)) {
                    reaction.users = reaction.users.filter(uId => uId !== userId);
                    reaction.count -= 1;
                    if (reaction.count <= 0) {
                        delete reactions[emoji];
                    } else {
                        reactions[emoji] = reaction;
                    }
                    message.reactions = reactions;
                    await message.save();

                    if (recipientId) {
                        io.to(recipientId).emit('reaction removed', { messageId, emoji, userId, recipientId });
                        io.to(userId).emit('reaction removed', { messageId, emoji, userId, recipientId });
                    } else {
                        io.emit('reaction removed', { messageId, emoji, userId });
                    }
                } else {
                    reaction.users.push(userId);
                    reaction.count += 1;
                    reactions[emoji] = reaction;
                    message.reactions = reactions;
                    await message.save();

                    if (recipientId) {
                        io.to(recipientId).emit('reaction added', { messageId, emoji, userId, recipientId });
                        io.to(userId).emit('reaction added', { messageId, emoji, userId, recipientId });
                    } else {
                        io.emit('reaction added', { messageId, emoji, userId });
                    }
                }
            }
        });


        socket.on('file upload chunk', (data, callback) => {
        const { messageId, fileName, fileType, fileSize, chunk, isLastChunk, recipientId } = data;

        if (!fileUploads[messageId]) {
            fileUploads[messageId] = {
                fileData: [],
                uploadedSize: 0,
                fileName,
                fileType,
                fileSize,
                recipientId,
                userId: socket.id,
            };
        }

        fileUploads[messageId].fileData.push(chunk);
        fileUploads[messageId].uploadedSize += chunk.length;

        const progress = Math.min(100, Math.floor((fileUploads[messageId].uploadedSize / fileSize) * 100));

        socket.emit(`file upload progress:${messageId}`, progress);
        if (recipientId && recipientId !== 'public') {
            io.to(recipientId).emit(`file upload progress:${messageId}`, progress);
        }

        if (isLastChunk) {
            const combinedBuffer = Buffer.concat(fileUploads[messageId].fileData);
            const fileExtension = path.extname(fileName);
            const newFileName = `${messageId}${fileExtension}`;
            const filePath = path.join(uploadsDir, newFileName);

            fs.writeFile(filePath, combinedBuffer)
                .then(() => {
                    const finalMessage = {
                        id: messageId,
                        userId: socket.id,
                        userName: fileUploads[messageId].userName,
                        timestamp: Date.now(),
                        recipientId: recipientId,
                        encryptedContent: encrypt(`File: ${fileName}`),
                        type: 'file',
                        fileName: fileName,
                        fileType: fileType,
                        fileSize: fileSize,
                        filePath: newFileName,
                        userProfilePicture: fileUploads[messageId].userProfilePicture,
                        status: 'sent',
                    };

                    socket.emit(`file upload complete:${messageId}`, { filePath: newFileName, fileName: fileName });
                    if (recipientId && recipientId !== 'public') {
                        io.to(recipientId).emit('new message', finalMessage);
                    } else {
                        io.emit('new message', finalMessage);
                    }
                    
                    delete fileUploads[messageId];
                    callback({ status: 'ok' });
                })
                .catch(err => {
                    console.error('Errore durante il salvataggio del file:', err);
                    delete fileUploads[messageId];
                    callback({ status: 'error' });
                });
        } else {
            callback({ status: 'ok' });
        }
    });

        
        socket.on('file chunk', (data, callback) => {
            const { id, chunk, isLast, fileName, fileType, fileSize, recipientId, userName, userProfilePicture } = data;

            if (!fileChunks[id]) {
                fileChunks[id] = {
                    fileData: [],
                    fileName,
                    fileType,
                    fileSize,
                    recipientId,
                    userId: socket.id,
                    userName,
                    userProfilePicture,
                };
            }

            fileChunks[id].fileData.push(chunk);

            if (isLast) {
                const combinedBuffer = Buffer.concat(fileChunks[id].fileData);
                const fileExtension = path.extname(fileName);
                const newFileName = `${id}${fileExtension}`;
                const filePath = path.join(uploadsDir, newFileName);

                fs.writeFile(filePath, combinedBuffer)
                .then(() => {
                    const finalMessage = {
                        id: id,
                        userId: socket.id,
                        userName: userName,
                        timestamp: Date.now(),
                      recipientId: recipientId,
                      encryptedContent: encrypt(`File: ${fileName}`),
                      type: 'file',
                      fileName: fileName,
                      fileType: fileType,
                      fileSize: fileSize,
                      filePath: newFileName,
                      userProfilePicture: userProfilePicture,
                      status: 'sent',
                    };

                    const message = new Message(finalMessage);
                    return message.save();
                })
                .then((savedMessage) => {
                    const isPrivate = !!recipientId && recipientId !== 'public';
                    if (isPrivate) {
                        io.to(recipientId).emit('file message', savedMessage.toObject());
                        io.to(socket.id).emit('file message', savedMessage.toObject());
                    } else {
                        io.emit('file message', savedMessage.toObject());
                    }

                    delete fileChunks[id];
                    console.log(`File saved: ${filePath}`);
                    callback({ status: 'ok' });
                })
                .catch((err) => {
                    console.error(`[Server] Error saving file ${id}:`, err);
                    delete fileChunks[id];
                    callback({ status: 'error' });
                });
            } else {
                callback({ status: 'ok' });
            }
        });

        socket.on('file upload progress', (data) => {
            const { id, progress, recipientId, userId } = data;
            const isPrivate = !!recipientId && recipientId !== 'public';
            if (isPrivate) {
                io.to(recipientId).emit('file upload progress', data);
                io.to(userId).emit('file upload progress', data);
            } else {
                io.emit('file upload progress', data);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            if (users[socket.id]) {
                const disconnectedUserName = users[socket.id].userName;
                delete users[socket.id];
                io.emit('online users', Object.values(users));
                socket.broadcast.emit('stop typing', disconnectedUserName);
            }
        });

        socket.on('delete message', async ({ messageId, isPrivate }) => {
        try {
            const deletedMessage = await Message.findOneAndDelete({ id: messageId });
            if (deletedMessage) {
                if (isPrivate) {
                    io.to(deletedMessage.userId).emit('message deleted', { messageId, isPrivate });
                    io.to(deletedMessage.recipientId).emit('message deleted', { messageId, isPrivate });
                } else {
                    io.emit('message deleted', { messageId, isPrivate });
                }
                console.log(`[${new Date().toISOString()}] Message deleted: ${messageId}`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error deleting message:`, error);
        }
    });
    });

    server.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});