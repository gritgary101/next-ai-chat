'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import { Pencil } from 'lucide-react'

// 初始化 Supabase 客户端
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Chat {
  id: number
  title: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [editingChatId, setEditingChatId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    const { data, error } = await supabase.from('chats').select('*')
    if (error) console.error('Error fetching chats:', error)
    else setChats(data || [])
  }

  const createNewChat = async () => {
    const { data, error } = await supabase
      .from('chats')
      .insert({ title: 'New Chat' })
      .select()
    if (error) console.error('Error creating new chat:', error)
    else {
      setChats([...chats, data[0]])
      setCurrentChatId(data[0].id)
      setMessages([])
      setEditingChatId(data[0].id)
      setEditingTitle('New Chat')
    }
  }

  const startEditing = (chat: Chat) => {
    setEditingChatId(chat.id)
    setEditingTitle(chat.title)
  }

  const saveEditedTitle = async () => {
    if (!editingChatId) return

    const { error } = await supabase
      .from('chats')
      .update({ title: editingTitle })
      .eq('id', editingChatId)

    if (error) {
      console.error('Error updating chat title:', error)
    } else {
      setChats(chats.map(chat => 
        chat.id === editingChatId ? { ...chat, title: editingTitle } : chat
      ))
      setEditingChatId(null)
    }
  }

  const selectChat = async (chatId: number) => {
    setCurrentChatId(chatId)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (error) console.error('Error fetching messages:', error)
    else setMessages(data.map(m => ({ role: m.role, content: m.content })))
  }

  const sendMessage = async () => {
    if (!input.trim() || !currentChatId) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      const assistantMessage: Message = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMessage])

      // Save messages to Supabase
      await supabase.from('messages').insert([
        { chat_id: currentChatId, role: 'user', content: input },
        { chat_id: currentChatId, role: 'assistant', content: data.message }
      ])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900 p-4">
        <Button onClick={createNewChat} className="w-full mb-4">Create New Chat</Button>
        <ScrollArea className="h-[calc(100vh-100px)]">
          {chats.map(chat => (
            <div key={chat.id} className="mb-2">
              {editingChatId === chat.id ? (
                <div className="flex items-center">
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={saveEditedTitle}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditedTitle()}
                    className="mr-2"
                  />
                  <Button onClick={saveEditedTitle} size="sm">Save</Button>
                </div>
              ) : (
                <div className={`p-2 flex items-center justify-between rounded cursor-pointer ${currentChatId === chat.id ? 'border border-slate-500' : ''}`}>
                  <span onClick={() => selectChat(chat.id)}>{chat.title}</span>
                  <Button onClick={() => startEditing(chat)} size="sm" variant="ghost">
                    <Pencil size={16} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[900px] flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  {message.role === 'user' ? (
                    <span>{message.content}</span>
                  ) : (
                    <ReactMarkdown className="prose max-w-none">
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}