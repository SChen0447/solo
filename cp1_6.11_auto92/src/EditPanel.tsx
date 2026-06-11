import React, { useState, useEffect, useCallback } from 'react';
import { KnowledgeNode, PRESET_COLORS, NodeType, NODE_COLORS } from './types';

interface EditPanelProps {
  node: KnowledgeNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<KnowledgeNode>) => void;
  onDelete: (id: string) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ node, isOpen, onClose, onUpdate, onDelete }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#7fb5b5');
  const [type, setType] = useState<NodeType>('concept');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description);
      setColor(node.color);
      setType(node.type);
      setLinks([...node.links]);
    }
  }, [node]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTitle(val);
      onUpdate({ title: val });
    },
    [onUpdate]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= 500) {
        setDescription(val);
        onUpdate({ description: val });
      }
    },
    [onUpdate]
  );

  const handleColorChange = useCallback(
    (c: string) => {
      setColor(c);
      onUpdate({ color: c });
    },
    [onUpdate]
  );

  const handleTypeChange = useCallback(
    (t: NodeType) => {
      setType(t);
      onUpdate({ type: t, color: NODE_COLORS[t] });
      setColor(NODE_COLORS[t]);
    },
    [onUpdate]
  );

  const handleAddLink = useCallback(() => {
    if (newLink.trim()) {
      const updated = [...links, newLink.trim()];
      setLinks(updated);
      onUpdate({ links: updated });
      setNewLink('');
    }
  }, [newLink, links, onUpdate]);

  const handleRemoveLink = useCallback(
    (index: number) => {
      const updated = links.filter((_, i) => i !== index);
      setLinks(updated);
      onUpdate({ links: updated });
    },
    [links, onUpdate]
  );

  const handleDelete = useCallback(() => {
    if (node) {
      onDelete(node.id);
    }
  }, [node, onDelete]);

  if (!node) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 50,
        right: isOpen ? 0 : -310,
        width: 300,
        height: 'calc(100vh - 50px)',
        background: 'rgba(26, 39, 56, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(42, 59, 76, 0.6)',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        padding: 20,
        overflowY: 'auto',
        color: '#c8d8e8',
        boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#e8f0f8' }}>Node Details</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8899aa',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#8899aa', marginBottom: 6 }}>Name</label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(13, 27, 42, 0.6)',
            border: '1px solid #2a3b4c',
            borderRadius: 6,
            color: '#e8f0f8',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#5db8e8')}
          onBlur={(e) => (e.target.style.borderColor = '#2a3b4c')}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#8899aa', marginBottom: 6 }}>
          Type
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['person', 'event', 'concept'] as NodeType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: type === t ? NODE_COLORS[t] : 'rgba(13, 27, 42, 0.6)',
                border: `1px solid ${type === t ? NODE_COLORS[t] : '#2a3b4c'}`,
                borderRadius: 6,
                color: type === t ? '#0d1b2a' : '#8899aa',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#8899aa', marginBottom: 6 }}>
          Description ({description.length}/500)
        </label>
        <textarea
          value={description}
          onChange={handleDescriptionChange}
          rows={5}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(13, 27, 42, 0.6)',
            border: '1px solid #2a3b4c',
            borderRadius: 6,
            color: '#e8f0f8',
            fontSize: 13,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#5db8e8')}
          onBlur={(e) => (e.target.style.borderColor = '#2a3b4c')}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#8899aa', marginBottom: 6 }}>Color Tag</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c,
                border: color === c ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                boxShadow: color === c ? `0 0 8px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#8899aa', marginBottom: 6 }}>Related Links</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type="text"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="Enter URL..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'rgba(13, 27, 42, 0.6)',
              border: '1px solid #2a3b4c',
              borderRadius: 6,
              color: '#e8f0f8',
              fontSize: 12,
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#5db8e8')}
            onBlur={(e) => (e.target.style.borderColor = '#2a3b4c')}
          />
          <button
            onClick={handleAddLink}
            style={{
              padding: '6px 12px',
              background: '#2a3b4c',
              border: '1px solid #3a4b5c',
              borderRadius: 6,
              color: '#c8d8e8',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'background 0.2s ease',
            }}
          >
            Add
          </button>
        </div>
        {links.map((link, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              marginBottom: 4,
              background: 'rgba(13, 27, 42, 0.4)',
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5db8e8' }}>
              {link}
            </span>
            <button
              onClick={() => handleRemoveLink(i)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e85d75',
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleDelete}
        style={{
          width: '100%',
          padding: '10px',
          background: 'rgba(232, 93, 117, 0.15)',
          border: '1px solid rgba(232, 93, 117, 0.3)',
          borderRadius: 6,
          color: '#e85d75',
          cursor: 'pointer',
          fontSize: 13,
          transition: 'all 0.2s ease',
          marginTop: 20,
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(232, 93, 117, 0.25)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(232, 93, 117, 0.15)')}
      >
        Delete Node
      </button>
    </div>
  );
};

export default EditPanel;
