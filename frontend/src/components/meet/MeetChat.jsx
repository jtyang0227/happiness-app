import { useState, useEffect, useRef } from 'react';
import meetApi from '../../services/meetApi';

export default function MeetChat({ meetId, currentMemberId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  function fetchMessages() {
    meetApi.getMessages(meetId)
      .then(setMessages)
      .catch(() => {});
  }

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 30000);
    return () => clearInterval(intervalRef.current);
  }, [meetId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const msg = await meetApi.sendMessage(meetId, content);
      setMessages(prev => [...prev, msg]);
      setText('');
    } catch (e) {
      setError(e.response?.data?.message || '메시지 전송 실패');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  }

  const grouped = [];
  let lastDate = '';
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== lastDate) {
      grouped.push({ type: 'date', label: formatDate(msg.createdAt), key: `d-${msg.id}` });
      lastDate = date;
    }
    grouped.push({ type: 'msg', msg });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}>
      {/* message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {grouped.length === 0 && (
          <div style={{ textAlign: 'center', color: '#5c5c7a', fontSize: 13, marginTop: 32 }}>
            아직 메시지가 없습니다.<br />먼저 인사를 건네보세요 👋
          </div>
        )}
        {grouped.map(item => {
          if (item.type === 'date') {
            return (
              <div key={item.key} style={{ textAlign: 'center', fontSize: 11, color: '#5c5c7a', margin: '8px 0' }}>
                {item.label}
              </div>
            );
          }
          const { msg } = item;
          const isMe = msg.senderId === currentMemberId;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
              {!isMe && (
                <div style={avatarStyle(msg.senderAvatar)}>
                  {!msg.senderAvatar && (msg.senderName?.[0] || '?')}
                </div>
              )}
              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {!isMe && <div style={{ fontSize: 11, color: '#9090b0', marginBottom: 3 }}>{msg.senderName}</div>}
                <div style={{
                  background: isMe ? '#5b6ef5' : 'rgba(255,255,255,0.07)',
                  color: '#fff',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '9px 13px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 10, color: '#5c5c7a', marginTop: 3 }}>{formatTime(msg.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      {error && <div style={{ color: '#f87171', fontSize: 12, padding: '4px 8px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, padding: '10px 0 0' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요… (Enter 전송)"
          rows={2}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '9px 12px',
            color: '#fff',
            fontSize: 13,
            resize: 'none',
            outline: 'none',
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            background: sending || !text.trim() ? 'rgba(91,110,245,0.3)' : '#5b6ef5',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            padding: '0 16px',
            cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            fontSize: 18,
            transition: 'background 0.15s',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

function avatarStyle(url) {
  return {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: url ? `url(${url}) center/cover` : '#4458e0',
    color: '#fff',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}
