
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Get all chats
app.get("/api/chats", (req, res) => {
    db.query("SELECT * FROM chats", (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json(results);
    });
});

// ✅ Create a new chat in a specific group
app.post("/api/chats", async (req, res) => {
    try {
        let { name, group_id } = req.body;
        if (!group_id) {
            return res.status(400).json({ error: "Group ID is required" });
        }

        // Fetch the count of existing chats to generate a unique name if not provided
        const countResult = await new Promise((resolve, reject) => {
            db.query("SELECT COUNT(*) AS count FROM chats", (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        });

        if (!name) {
            name = `New Chat ${countResult + 1}`; // Default naming system
        }

        const initialMessage = JSON.stringify([{ sender: "System", message: "Welcome to the chat!" }]);

        const result = await new Promise((resolve, reject) => {
            db.query(
                "INSERT INTO chats (name, group_id, messages) VALUES (?, ?, ?)", 
                [name, group_id, initialMessage], 
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        res.status(201).json({
            id: result.insertId,
            name,
            group_id,
            messages: JSON.parse(initialMessage),
        });
    } catch (error) {
        console.error("Error creating chat:", error);
        res.status(500).json({ error: "Database error", details: error.message });
    }
});


// ✅ Send a message to a chat
app.post("/api/messages", (req, res) => {
    const { chatId, sender, message } = req.body;

    if (!chatId || !sender || !message) {
        return res.status(400).json({ error: "Chat ID, sender, and message are required" });
    }

    db.query("SELECT messages FROM chats WHERE id = ?", [chatId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        if (results.length === 0) {
            return res.status(404).json({ error: "Chat not found" });
        }

        let existingMessages = [];
        try {
            if (results[0].messages && typeof results[0].messages === "string") {
                existingMessages = JSON.parse(results[0].messages);
            } else if (Array.isArray(results[0].messages)) {
                existingMessages = results[0].messages;
            } else {
                existingMessages = [];
            }
        } catch (parseError) {
            console.error("Error parsing messages:", parseError, "Raw data:", results[0].messages);
            return res.status(500).json({ error: "Error parsing messages", details: parseError.message });
        }

        const newMessage = { sender, message, timestamp: new Date().toISOString() };
        existingMessages.push(newMessage);
        const updatedMessages = JSON.stringify(existingMessages); // Ensure valid JSON

        db.query("UPDATE chats SET messages = ? WHERE id = ?", [updatedMessages, chatId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: "Database update error", details: updateErr });

            res.json({ chatId, messages: existingMessages }); // Ensure correct response format
        });
    });
});


// ✅ Get all messages for a chat
app.get("/api/messages/:chatId", (req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
        return res.status(400).json({ error: "Chat ID is required" });
    }

    db.query("SELECT messages FROM chats WHERE id = ?", [chatId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        if (results.length === 0) {
            return res.status(404).json({ error: "Chat not found" });
        }

        let existingMessages = [];
        try {
            if (results[0].messages && typeof results[0].messages === "string") {
                existingMessages = JSON.parse(results[0].messages);
            } else if (Array.isArray(results[0].messages)) {
                existingMessages = results[0].messages;
            } else {
                existingMessages = [];
            }
        } catch (parseError) {
            console.error("Error parsing messages:", parseError, "Raw data:", results[0].messages);
            return res.status(500).json({ error: "Error parsing messages", details: parseError.message });
        }

        res.json({ chatId, messages: existingMessages });
    });
});
app.put("/api/chats/:chatId/update-name", (req, res) => {
    const { chatId } = req.params;
    const { message } = req.body;

    if (!chatId || !message) {
        return res.status(400).json({ error: "Chat ID and message are required" });
    }

    const updatedName = message.substring(0, 20); // Example: Set chat name from message (first 20 chars)

    db.query(
        "UPDATE chats SET name = ? WHERE id = ?",
        [updatedName, chatId],
        (err, result) => {
            if (err) {
                console.error("Error updating chat name:", err);
                return res.status(500).json({ error: "Database error" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Chat not found" });
            }

            res.json({ success: true, newChatName: updatedName });
        }
    );
});



// ✅ Create a new group with an initial chat
app.post("/api/groups", (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Group name is required" });
    }

    db.query("INSERT INTO chat_groups (name) VALUES (?)", [name], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        const groupId = result.insertId;
        const defaultChatName = "New Chat 1";
        const initialMessage = JSON.stringify([{ sender: "System", message: "Hi, how can I help you?" }]);

        db.query(
            "INSERT INTO chats (name, group_id, messages) VALUES (?, ?, ?)",
            [defaultChatName, groupId, initialMessage],
            (chatErr, chatResult) => {
                if (chatErr) {
                    console.error("Error adding default chat:", chatErr);
                    return res.status(500).json({ error: "Failed to create initial chat" });
                }

                res.json({
                    id: groupId,
                    name,
                    chats: [{ id: chatResult.insertId, name: defaultChatName, messages: JSON.parse(initialMessage) }],
                });
            }
        );
    });
});

// ✅ Get all groups with their chats
app.get("/api/groups", (req, res) => {
    const query = `
        SELECT g.id AS group_id, g.name AS group_name, 
               c.id AS chat_id, c.name AS chat_name, c.messages
        FROM chat_groups g
        LEFT JOIN chats c ON g.id = c.group_id
        ORDER BY g.id, c.id;
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        const groups = {};
        results.forEach(row => {
            if (!groups[row.group_id]) {
                groups[row.group_id] = { id: row.group_id, name: row.group_name, chats: [] };
            }
            if (row.chat_id) {
                groups[row.group_id].chats.push({ id: row.chat_id, name: row.chat_name, messages: JSON.parse(row.messages || "[]") });
            }
        });

        res.json(Object.values(groups));
    });
});

// ✅ Delete all chats and groups (reset system)
app.delete("/api/reset", (req, res) => {
    db.query("DELETE FROM chats", (err) => {
        if (err) return res.status(500).json({ error: "Error deleting chats", details: err });

        db.query("DELETE FROM chat_groups", (groupErr) => {
            if (groupErr) return res.status(500).json({ error: "Error deleting groups", details: groupErr });

            res.json({ message: "All chats and groups deleted" });
        });
    });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
