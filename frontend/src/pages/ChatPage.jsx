import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage as sendMessageRest,
  uploadChatAttachment,
} from '../services/chatService';
import useChatSocket from '../hooks/useChatSocket';
import './ChatPage.css';

const parseUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const mergeMessage = (items, message) => {
  if (!message?.id || items.some((item) => Number(item.id) === Number(message.id))) return items;
  return [...items, message].sort((a, b) => Number(a.id) - Number(b.id));
};

const formatTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatConversationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(value);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
};

function ChatPage() {
  const user = useMemo(parseUser, []);
  const userId = Number(user.userId || user.id);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(
    () => new URLSearchParams(window.location.search).get('conversationId') || null
  );
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimerRef = useRef(null);
  const activeIdRef = useRef(null);

  const activeConversation = conversations.find(
    (conversation) => Number(conversation.id) === Number(activeId),
  );

  const refreshConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      setActiveId((current) => (
        data.some((item) => Number(item.id) === Number(current)) ? current : data[0]?.id || null
      ));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách hội thoại.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIncomingMessage = useCallback((message) => {
    const conversationId = Number(message.conversationId);
    if (conversationId === Number(activeIdRef.current)) {
      setMessages((current) => mergeMessage(current, message));
      markConversationRead(conversationId, message.id)
        .then(() => window.dispatchEvent(new Event('chat:unread-changed')))
        .catch(() => {});
    } else {
      window.dispatchEvent(new Event('chat:unread-changed'));
    }
    setConversations((current) => current
      .map((conversation) => Number(conversation.id) === conversationId
        ? {
            ...conversation,
            lastMessageAt: message.createdAt,
            lastMessagePreview: message.type === 'TEXT'
              ? message.content
              : `📎 ${message.attachmentName || 'Tệp đính kèm'}`,
            unreadCount: conversationId === Number(activeIdRef.current)
              ? 0
              : Number(conversation.unreadCount || 0) + 1,
          }
        : conversation)
      .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
  }, []);

  const handleRead = useCallback((payload) => {
    if (Number(payload.conversationId) !== Number(activeIdRef.current)) return;
    setMessages((current) => current.map((message) => (
      Number(message.senderId) === userId ? { ...message, status: 'READ' } : message
    )));
  }, [userId]);

  const handleTyping = useCallback((payload) => {
    if (Number(payload.conversationId) === Number(activeIdRef.current)) {
      setTyping(Boolean(payload.isTyping));
    }
  }, []);

  const { socket, connected } = useChatSocket({
    onMessage: handleIncomingMessage,
    onRead: handleRead,
    onTyping: handleTyping,
  });

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    activeIdRef.current = activeId;
    setTyping(false);
    if (!activeId) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);
    getMessages(activeId)
      .then((data) => {
        if (!active) return;
        setMessages(data);
        const lastId = data.at(-1)?.id || null;
        return markConversationRead(activeId, lastId);
      })
      .then(() => {
        if (!active) return;
        setConversations((current) => current.map((conversation) => (
          Number(conversation.id) === Number(activeId)
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )));
        window.dispatchEvent(new Event('chat:unread-changed'));
        socket.current?.emit('conversation:join', { conversationId: activeId });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Không thể tải tin nhắn.');
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });

    return () => { active = false; };
  }, [activeId, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const appendSentMessage = (message) => {
    setMessages((current) => mergeMessage(current, message));
    setConversations((current) => current.map((conversation) => (
      Number(conversation.id) === Number(message.conversationId)
        ? {
            ...conversation,
            lastMessageAt: message.createdAt,
            lastMessagePreview: message.type === 'TEXT'
              ? message.content
              : `📎 ${message.attachmentName || 'Tệp đính kèm'}`,
          }
        : conversation
    )));
  };

  const sendPayload = async (payload) => {
    if (!activeId) return;
    setSending(true);
    setError('');
    try {
      let message;
      if (connected && socket.current) {
        message = await new Promise((resolve, reject) => {
          socket.current.timeout(7000).emit(
            'message:send',
            { conversationId: activeId, ...payload },
            (timeoutError, response) => {
              if (timeoutError) return reject(new Error('Server không phản hồi.'));
              if (!response?.success) return reject(new Error(response?.error?.message || 'Gửi thất bại.'));
              return resolve(response.data);
            },
          );
        });
      } else {
        message = await sendMessageRest(activeId, payload);
      }
      appendSentMessage(message);
      setDraft('');
    } catch (sendError) {
      setError(sendError.response?.data?.message || sendError.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending || activeConversation?.status !== 'ACTIVE') return;
    socket.current?.emit('typing:stop', { conversationId: activeId });
    sendPayload({ content, type: 'TEXT' });
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    if (!activeId || !socket.current) return;
    socket.current.emit('typing:start', { conversationId: activeId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.current?.emit('typing:stop', { conversationId: activeId });
    }, 1200);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeId) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Tệp đính kèm không được vượt quá 10 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const attachment = await uploadChatAttachment(activeId, file);
      await sendPayload({
        content: '',
        type: attachment.type,
        attachmentUrl: attachment.url,
        attachmentKey: attachment.key,
        attachmentName: attachment.name,
        attachmentMime: attachment.mime,
        attachmentSize: attachment.size,
      });
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Không thể tải tệp đính kèm.');
    } finally {
      setUploading(false);
    }
  };

  if (!['STUDENT', 'ENTERPRISE'].includes(user.role)) {
    return (
      <section className="chat-empty-page">
        <h1>Chat realtime</h1>
        <p>Chỉ sinh viên và mentor doanh nghiệp được sử dụng tính năng này.</p>
      </section>
    );
  }

  return (
    <section className="chat-page">
      <header className="chat-page-header">
        <div>
          <span className="chat-eyebrow">Trao đổi thực tập</span>
          <h1>Tin nhắn</h1>
        </div>
        <span className={`chat-connection ${connected ? 'online' : ''}`}>
          <i /> {connected ? 'Realtime' : 'Đang kết nối lại'}
        </span>
      </header>

      {error && <div className="chat-alert" role="alert">{error}</div>}

      <div className="chat-layout">
        <aside className="conversation-panel">
          <div className="conversation-title">
            <strong>Hội thoại</strong>
            <span>{conversations.length}</span>
          </div>
          {loading ? (
            <div className="chat-panel-state">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="chat-panel-state">
              {user.role === 'STUDENT'
                ? 'Bạn chưa được phân công mentor doanh nghiệp.'
                : 'Bạn chưa được phân công sinh viên.'}
            </div>
          ) : conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={`conversation-item ${Number(activeId) === Number(conversation.id) ? 'active' : ''}`}
              onClick={() => setActiveId(conversation.id)}
            >
              <span className="chat-avatar">
                {conversation.contact.avatar
                  ? <img src={conversation.contact.avatar} alt="" />
                  : (conversation.contact.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="conversation-copy">
                <span className="conversation-name">
                  <strong>{conversation.contact.name}</strong>
                  <small>{formatConversationTime(conversation.lastMessageAt)}</small>
                </span>
                <span className="conversation-preview">
                  {conversation.lastMessagePreview || 'Bắt đầu cuộc trò chuyện'}
                </span>
              </span>
              {conversation.unreadCount > 0 && (
                <span className="chat-unread">{conversation.unreadCount}</span>
              )}
            </button>
          ))}
        </aside>

        <div className="message-panel">
          {!activeConversation ? (
            <div className="message-empty">
              <span>💬</span>
              <h2>Chọn một cuộc hội thoại</h2>
              <p>Tin nhắn với mentor hoặc sinh viên sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <>
              <header className="message-header">
                <span className="chat-avatar large">
                  {activeConversation.contact.avatar
                    ? <img src={activeConversation.contact.avatar} alt="" />
                    : (activeConversation.contact.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{activeConversation.contact.name}</strong>
                  <small>
                    {activeConversation.contact.companyName
                      || activeConversation.contact.studentCode
                      || activeConversation.contact.email}
                  </small>
                </div>
              </header>

              <div className="message-list">
                {loadingMessages ? (
                  <div className="chat-panel-state">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="message-empty compact">
                    <span>👋</span>
                    <p>Hãy gửi lời chào để bắt đầu trao đổi.</p>
                  </div>
                ) : messages.map((message) => {
                  const mine = Number(message.senderId) === userId;
                  return (
                    <div key={message.id} className={`message-row ${mine ? 'mine' : ''}`}>
                      <div className={`message-bubble ${mine ? 'mine' : ''}`}>
                        {message.type === 'IMAGE' && message.attachmentUrl && (
                          <a href={message.attachmentUrl} target="_blank" rel="noreferrer">
                            <img className="message-image" src={message.attachmentUrl} alt={message.attachmentName || 'Ảnh'} />
                          </a>
                        )}
                        {message.type === 'FILE' && message.attachmentUrl && (
                          <a className="message-file" href={message.attachmentUrl} target="_blank" rel="noreferrer">
                            <span>📄</span>
                            <span>{message.attachmentName || 'Tệp đính kèm'}</span>
                          </a>
                        )}
                        {message.content && <p>{message.content}</p>}
                        <span className="message-meta">
                          {formatTime(message.createdAt)}
                          {mine && <span>{message.status === 'READ' ? '✓✓' : '✓'}</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {typing && <div className="typing-indicator"><i /><i /><i /></div>}
                <div ref={bottomRef} />
              </div>

              {activeConversation.status !== 'ACTIVE' ? (
                <div className="chat-archived">Kỳ thực tập đã kết thúc. Hội thoại đang ở chế độ chỉ đọc.</div>
              ) : (
                <form className="chat-composer" onSubmit={handleSubmit}>
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFile}
                  />
                  <button
                    type="button"
                    className="attachment-button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || sending}
                    title="Đính kèm ảnh hoặc PDF"
                  >
                    {uploading ? '…' : '📎'}
                  </button>
                  <textarea
                    rows="1"
                    maxLength="2000"
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSubmit(event);
                      }
                    }}
                    placeholder="Nhập tin nhắn..."
                  />
                  <button className="send-button" type="submit" disabled={!draft.trim() || sending}>
                    ➤
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default ChatPage;
