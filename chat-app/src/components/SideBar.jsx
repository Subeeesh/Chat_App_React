import React, { useState } from "react";
import {
  XMarkIcon,
  Bars3Icon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

const Sidebar = ({
  groups,
  setGroups,
  chats,
  setChats,
  activeChatId,
  setActiveChatId,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [groupCount, setGroupCount] = useState(1);

  // Create a new group with a default chat "New Chat 1"
  const handleNewGroupChat = async () => {
    const newGroupName = `Group ${groupCount}`;

    try {
      const response = await fetch("http://localhost:5000/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (!response.ok) throw new Error("Failed to create group");

      const newGroup = await response.json();

      setGroups((prevGroups) => [...prevGroups, newGroup]);
      setChats((prevChats) => [...prevChats, ...newGroup.chats]); // Add new group's chats
      setActiveChatId(newGroup.chats[0]?.id || null);
      setGroupCount((prevCount) => prevCount + 1);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  // Create a new chat inside a group
  const handleNewChatInGroup = async (groupId) => {
    console.log("Creating chat for group:", groupId); // ✅ Debugging step

    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      console.error("Group not found:", groupId);
      return;
    }

    const newChatName = `New Chat ${group.chats.length + 1}`;

    try {
      const response = await fetch("http://localhost:5000/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChatName, group_id: groupId }),
      });

      const responseData = await response.json();
      console.log("Server response:", responseData); // ✅ Debugging step

      if (!response.ok)
        throw new Error(responseData.error || "Failed to create chat");

      setGroups((prevGroups) =>
        prevGroups.map((g) =>
          g.id === groupId ? { ...g, chats: [...g.chats, responseData] } : g
        )
      );
      setChats((prevChats) => [...prevChats, responseData]);
      setActiveChatId(responseData.id);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <div
      className={`bg-gray-900 text-white ${
        isOpen ? "w-64" : "w-16"
      } h-screen transition-all duration-300 flex flex-col`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
        {isOpen && <h2 className="text-lg font-semibold">Chat App</h2>}
        <TrashIcon
          className="w-6 h-6 text-red-500 cursor-pointer"
          onClick={() => setChats([])}
        />
      </div>

      {/* New Group Button */}
      <button
        className="flex items-center bg-gray-700 px-4 py-2 mx-2 rounded-lg hover:bg-gray-600"
        onClick={handleNewGroupChat}
      >
        <PlusIcon className="w-5 h-5 mr-2" /> {isOpen && "New Group"}
      </button>

      {/* Groups & Chats List */}
      <div className="p-2 flex-grow overflow-y-auto">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            {/* Group Header */}
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
              <span className="text-lg font-semibold">{group.name}</span>
              <button onClick={() => handleNewChatInGroup(group.id)}>
                <PlusIcon className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Chats in Group */}
            <div className="pl-4">
              {group.chats.length > 0 ? (
                group.chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-2 cursor-pointer hover:bg-gray-700 ${
                      chat.id === activeChatId ? "bg-gray-600" : ""
                    }`}
                    onClick={() => setActiveChatId(chat.id)}
                  >
                    {chat.name}
                    {console.log(chat.name)}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-400">
                  No chats in this group
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
