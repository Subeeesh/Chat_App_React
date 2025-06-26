import React, { useState, useEffect } from "react";

const ChatBox = ({ chats, setChats, activeChatId, updateChatName }) => {
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  console.log(
    "ChatBox: Rendering with activeChatId:",
    activeChatId,
    "activeChat:",
    activeChat
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/chats");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        setChats(data);
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };

    const fetchMessages = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/messages/${activeChatId}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
      }
    };

    if (activeChatId) {
      fetchChats();
      fetchMessages();
    }
  }, [activeChatId, setChats]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;

    const newMessage = { sender: "user", message: input };

    // Optimistically update UI
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInput("");

    try {
      let updatedChatName = activeChat.name;

      if (
        !activeChat?.messages ||
        activeChat.messages.length === 0 ||
        activeChat.name.startsWith("New Chat")
      ) {
        const nameUpdateResponse = await fetch(
          `http://localhost:5000/api/chats/${activeChatId}/update-name`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: activeChatId,
              sender: "user",
              message: input,
            }),
          }
        );

        if (!nameUpdateResponse.ok) {
          const errorData = await nameUpdateResponse.json();
          throw new Error(
            `HTTP error! status: ${
              nameUpdateResponse.status
            }, details: ${JSON.stringify(errorData)}`
          );
        }

        const nameUpdateData = await nameUpdateResponse.json();
        updatedChatName = nameUpdateData.newChatName;

        // ✅ Update chat name in App.js state
        updateChatName(activeChatId, updatedChatName);
      }

      const messageResponse = await fetch(
        `http://localhost:5000/api/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: activeChatId,
            sender: "user",
            message: input,
          }),
        }
      );

      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(
          `HTTP error! status: ${
            messageResponse.status
          }, details: ${JSON.stringify(errorData)}`
        );
      }

      const updatedMessages = await messageResponse.json();
      if (updatedMessages?.messages?.length > 0) {
        setMessages(updatedMessages.messages);
      }
    } catch (error) {
      console.error("Error saving chat:", error);
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 h-screen bg-gray-800 text-white p-4">
        No chat selected.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-screen bg-gray-800 text-white">
      <div className="p-4 bg-gray-900 text-xl font-semibold">
        {activeChat.name}
      </div>

      <div className="flex-1 p-4 overflow-auto space-y-2 flex flex-col">
        {messages?.length > 0 ? (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-[70%] min-w-[100px] text-white ${
                msg.sender === "user"
                  ? "bg-blue-500 self-end"
                  : "bg-gray-700 self-start"
              }`}
            >
              {msg.message} {console.log("Rendering message:", msg)}
            </div>
          ))
        ) : (
          <p className="text-gray-400">No messages yet.</p>
        )}
      </div>

      <div className="p-4 bg-gray-900 flex items-center">
        <input
          type="text"
          className="flex-1 p-2 bg-gray-700 rounded-lg outline-none text-white"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="ml-2 px-4 py-2 bg-blue-500 rounded-lg"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
