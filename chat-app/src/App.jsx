import React, { useState } from "react";
import Sidebar from "./components/SideBar";
import ChatBox from "./components/ChatBox";

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [groups, setGroups] = useState([]);

  // ✅ Function to update chat name in both `chats` and `groups` state
  const updateChatName = (chatId, newName) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId ? { ...chat, name: newName } : chat
      )
    );

    setGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        chats: group.chats.map((chat) =>
          chat.id === chatId ? { ...chat, name: newName } : chat
        ),
      }))
    );
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        chats={chats}
        setChats={setChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        groups={groups}
        setGroups={setGroups}
      />

      <ChatBox
        chats={chats}
        setChats={setChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        updateChatName={updateChatName} // ✅ Pass function to ChatBox
      />
    </div>
  );
}

export default App;
