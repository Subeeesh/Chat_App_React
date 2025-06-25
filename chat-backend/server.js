require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getConnection } = require('./db');

const app = express();
const port = 5000;

app.use(cors({
    origin: 'http://localhost:3000' // Replace with frontend URL in production
}));
app.use(express.json()); // Enable JSON request parsing

// ✅ API: Create a New Chat
app.post('/api/chats', async (req, res) => {
    console.log("Received request body:", req.body);

    let { groupId, chatName, messages } = req.body;
    if (!messages) messages = []; // Ensure messages is an array

    let connection;
    try {
        connection = await getConnection();

        // Count existing chats in the group
        const [existingChats] = await connection.execute(
            'SELECT COUNT(*) AS chatCount FROM chats WHERE group_id = ?', 
            [groupId]
        );

        let chatNumber = (existingChats[0]?.chatCount || 0) + 1;
        if (!chatName) chatName = `New Chat ${chatNumber}`;

        console.log("Generated Chat Name:", chatName);

        // ✅ Fix: Ensure messages column gets an explicit JSON value
        const sql = 'INSERT INTO chats (group_id, name, messages) VALUES (?, ?, ?)';
        const params = [groupId, chatName, JSON.stringify([])];

        const [result] = await connection.execute(sql, params);
        const chatId = result.insertId;

        console.log("Chat created:", { chatId, groupId, chatName });

        res.json({ chatId, groupId, chatName });

    } catch (error) {
        console.error('Error saving chat:', error);
        res.status(500).json({ error: 'Failed to save chat', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ API: Update Chat Name on First Message
app.put('/api/chats/:chatId/update-name', async (req, res) => {
    console.log("Updating chat name:", req.body);
    
    const { chatId } = req.params;
    const { message } = req.body;

    let connection;
    try {
        connection = await getConnection();

        // Fetch current chat name
        const [chat] = await connection.execute(
            'SELECT name FROM chats WHERE id = ?', 
            [chatId]
        );

        if (chat.length === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const existingName = chat[0].name;

        // ✅ Only update if name is still the default
        if (existingName.startsWith("New Chat")) {
            await connection.execute(
                'UPDATE chats SET name = ? WHERE id = ?', 
                [message, chatId]
            );

            return res.json({ message: 'Chat name updated successfully', chatId, newChatName: message });
        }

        res.json({ message: 'Chat name remains unchanged', chatId, currentChatName: existingName });

    } catch (error) {
        console.error('Error updating chat name:', error);
        res.status(500).json({ error: 'Failed to update chat name', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ API: Fetch All Chats
app.get('/api/chats', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM chats');

        const chatsWithParsedMessages = rows.map(chat => ({
            ...chat,
            messages: chat.messages ? chat.messages : []
        }));

        res.json(chatsWithParsedMessages);

    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({ error: 'Failed to get chats' });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ API: Create a New Group
app.post('/api/groups', async (req, res) => {
    const { groupName } = req.body;

    if (!groupName) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    let connection;
    try {
        connection = await getConnection();

        const sql = 'INSERT INTO chat_groups (name) VALUES (?)';
        const params = [groupName];

        const [result] = await connection.execute(sql, params);
        const newGroupId = result.insertId;

        res.status(201).json({ message: 'Group created successfully', groupId: newGroupId });

    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ API: Fetch All Groups
app.get('/api/groups', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM chat_groups');

        res.json(rows);

    } catch (error) {
        console.error('Error getting groups:', error);
        res.status(500).json({ error: 'Failed to get groups', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ API: Delete All Chats
app.delete('/api/chats', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM chats');
        res.json({ message: 'All chats deleted successfully' });

    } catch (error) {
        console.error('Error deleting chats:', error);
        res.status(500).json({ error: 'Failed to delete chats', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ API: Delete All Groups
app.delete('/api/groups', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM chat_groups');
        res.json({ message: 'All groups deleted successfully' });

    } catch (error) {
        console.error('Error deleting groups:', error);
        res.status(500).json({ error: 'Failed to delete groups', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Start Express Server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
