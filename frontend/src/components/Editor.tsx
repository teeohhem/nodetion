import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StarIcon } from './Icons';
import { BlockItem } from './BlockItem';
import { EditorContext, EditorContextType, Block } from '../context/EditorContext';

interface EditorProps {
  pageId: string;
  initialTitle: string;
  initialIcon: string | null;
  initialCover: string | null;
  initialBlocks: Block[];
  isFavorite: boolean;
  onSavePage: (data: { title?: string; icon?: string | null; cover?: string | null; content?: Block[]; isFavorite?: boolean }) => Promise<void>;
  onSelectPage?: (id: string) => void;
}

const BLOCK_TYPES = [
  { type: 'text', label: 'Text', desc: 'Plain writing', icon: '✍️' },
  { type: 'heading1', label: 'Heading 1', desc: 'Large title', icon: 'H1' },
  { type: 'heading2', label: 'Heading 2', desc: 'Medium title', icon: 'H2' },
  { type: 'heading3', label: 'Heading 3', desc: 'Small title', icon: 'H3' },
  { type: 'todo', label: 'To-do List', desc: 'Checkbox items', icon: '☑️' },
  { type: 'bullet', label: 'Bulleted List', desc: 'Simple bullet list', icon: '•' },
  { type: 'numbered', label: 'Numbered List', desc: 'Sequential list', icon: '1.' },
  { type: 'quote', label: 'Quote', desc: 'Highlighted quotes', icon: '💬' },
  { type: 'code', label: 'Code Block', desc: 'Syntax code box', icon: '💻' },
  { type: 'subpage', label: 'Subpage', desc: 'Add nested document', icon: '📄' }
] as const;

const COVER_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  'linear-gradient(135deg, #fdfbf7 0%, #e1eec3 100%)',
  '#1e1e24',
  '#2d3748',
  '#1a202c',
  '#319795',
  '#2b6cb0',
  '#4a5568'
];

const EMOJI_PRESETS = [
  '📓', '🚀', '💡', '🔥', '📚', '🎯', '☘️', '🛠️', '✨', '⚡',
  '💻', '🎨', '📝', '🧠', '💼', '🏡', '🌍', '🍿', '🍕', '🐱',
  '🐶', '🦄', '🌈', '🎉', '🍀', '🔑', '⏰', '🛡️', '📊', '💬'
];

export const Editor: React.FC<EditorProps> = ({
  pageId,
  initialTitle,
  initialIcon,
  initialCover,
  initialBlocks,
  isFavorite,
  onSavePage,
  onSelectPage
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState<string | null>(initialIcon);
  const [cover, setCover] = useState<string | null>(initialCover);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const coverPickerRef = useRef<HTMLDivElement | null>(null);

  const titleRef = useRef(title);
  titleRef.current = title;
  const iconRef = useRef(icon);
  iconRef.current = icon;
  const coverRef = useRef(cover);
  coverRef.current = cover;
  const activeMenuIndexRef = useRef(activeMenuIndex);
  activeMenuIndexRef.current = activeMenuIndex;
  const menuSearchRef = useRef(menuSearch);
  menuSearchRef.current = menuSearch;
  const focusedBlockIdRef = useRef(focusedBlockId);
  focusedBlockIdRef.current = focusedBlockId;

  useEffect(() => {
    setTitle(initialTitle);
    setIcon(initialIcon);
    setCover(initialCover);
    setBlocks(initialBlocks.length > 0 ? initialBlocks : [{ id: 'init-1', type: 'text', data: { text: '' } }]);
    setShowCoverPicker(false);
    setShowEmojiPicker(false);
  }, [pageId, initialTitle, initialIcon, initialCover, initialBlocks]);

  // Global click-outside listener to dismiss popover pickers cleanly
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(targetNode)) {
        setShowEmojiPicker(false);
      }
      if (coverPickerRef.current && !coverPickerRef.current.contains(targetNode)) {
        setShowCoverPicker(false);
      }
      // Click-outside for active slash command menu popover
      if (activeMenuIndexRef.current !== null) {
        const clickedInsidePopover = targetNode instanceof Element && targetNode.closest('.menu-popover');
        const clickedInsideBlock = targetNode instanceof Element && targetNode.closest('.block-container');
        if (!clickedInsidePopover && !clickedInsideBlock) {
          setActiveMenuIndex(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const saveTimeout = useRef<any | null>(null);

  const triggerSave = useCallback((updatedTitle: string, updatedIcon: string | null, updatedCover: string | null, updatedBlocks: Block[]) => {
    setSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        await onSavePage({
          title: updatedTitle,
          icon: updatedIcon,
          cover: updatedCover,
          content: updatedBlocks
        });
      } catch (err) {
        console.error('Auto-save error:', err);
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [onSavePage]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerSave(newTitle, iconRef.current, coverRef.current, blocks);
  };

  const handleBlockChange = useCallback((blockId: string, text: string) => {
    setBlocks(prevBlocks => {
      const updatedBlocks = prevBlocks.map(b => {
        if (b.id === blockId) {
          return { ...b, data: { ...b.data, text } };
        }
        return b;
      });
      triggerSave(titleRef.current, iconRef.current, coverRef.current, updatedBlocks);

      if (text.endsWith('/')) {
        const idx = prevBlocks.findIndex(b => b.id === blockId);
        setActiveMenuIndex(idx);
        setMenuSearch('');
      } else if (activeMenuIndexRef.current !== null) {
        const slashIndex = text.lastIndexOf('/');
        if (slashIndex !== -1) {
          setMenuSearch(text.substring(slashIndex + 1));
        } else {
          setActiveMenuIndex(null);
        }
      }
      return updatedBlocks;
    });
  }, [triggerSave]);

  const handleTodoToggle = useCallback((blockId: string) => {
    setBlocks(prev => {
      const updatedBlocks = prev.map(b => {
        if (b.id === blockId) {
          return { ...b, data: { ...b.data, checked: !b.data.checked } };
        }
        return b;
      });
      triggerSave(titleRef.current, iconRef.current, coverRef.current, updatedBlocks);
      return updatedBlocks;
    });
  }, [triggerSave]);

  const handleSelectBlockType = useCallback(async (blockIndex: number, type: Block['type']) => {
    setBlocks(prev => {
      const block = prev[blockIndex];
      if (!block) return prev;
      let cleanedText = block.data.text;
      
      const slashIdx = cleanedText.lastIndexOf('/');
      if (slashIdx !== -1) {
        cleanedText = cleanedText.substring(0, slashIdx);
      }

      if (type === 'subpage') {
        return prev;
      }

      const updatedBlocks = [...prev];
      updatedBlocks[blockIndex] = {
        ...block,
        type,
        data: {
          ...block.data,
          text: cleanedText,
          checked: type === 'todo' ? false : undefined,
          language: type === 'code' ? 'javascript' : undefined
        }
      };

      triggerSave(titleRef.current, iconRef.current, coverRef.current, updatedBlocks);
      setActiveMenuIndex(null);
      return updatedBlocks;
    });

    if (type === 'subpage') {
      try {
        const res = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Untitled Subpage',
            parentId: pageId
          })
        });
        if (res.ok) {
          const newSubpage = await res.json();
          setBlocks(prev => {
            const block = prev[blockIndex];
            if (!block) return prev;
            const updatedBlocks = [...prev];
            updatedBlocks[blockIndex] = {
              id: block.id,
              type: 'subpage',
              data: {
                text: 'Untitled Subpage',
                pageId: newSubpage.id
              }
            };
            triggerSave(titleRef.current, iconRef.current, coverRef.current, updatedBlocks);
            setActiveMenuIndex(null);
            return updatedBlocks;
          });
        }
      } catch (err) {
        console.error('Failed to create subpage block:', err);
      }
    }
  }, [pageId, triggerSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number, block: Block) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (activeMenuIndexRef.current !== null) {
        const filtered = BLOCK_TYPES.filter(t => t.label.toLowerCase().includes(menuSearchRef.current.toLowerCase()));
        if (filtered.length > 0) {
          handleSelectBlockType(index, filtered[0].type);
          return;
        }
      }

      // Notion behavior: if block content is empty and it is a list type, hitting Enter converts it to text
      if (block.data.text === '' && (block.type === 'todo' || block.type === 'bullet' || block.type === 'numbered')) {
        setBlocks(prev => {
          const updated = [...prev];
          updated[index] = {
            ...block,
            type: 'text',
            data: { text: '' }
          };
          triggerSave(titleRef.current, iconRef.current, coverRef.current, updated);
          return updated;
        });
        return;
      }

      const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const nextType = (block.type === 'todo' || block.type === 'bullet' || block.type === 'numbered')
        ? block.type
        : 'text';

      const newBlock: Block = {
        id: newBlockId,
        type: nextType,
        data: {
          text: '',
          checked: nextType === 'todo' ? false : undefined
        }
      };

      setBlocks(prev => {
        const updatedBlocks = [...prev];
        updatedBlocks.splice(index + 1, 0, newBlock);
        triggerSave(titleRef.current, iconRef.current, coverRef.current, updatedBlocks);
        return updatedBlocks;
      });
      setFocusedBlockId(newBlockId);
    }

    if (e.key === 'Backspace' && block.data.text === '') {
      e.preventDefault();

      if (block.type === 'todo' || block.type === 'bullet' || block.type === 'numbered') {
        // Convert to plain text block first instead of immediately deleting
        setBlocks(prev => {
          const updated = [...prev];
          updated[index] = {
            ...block,
            type: 'text',
            data: { text: '' }
          };
          triggerSave(titleRef.current, iconRef.current, coverRef.current, updated);
          return updated;
        });
        return;
      }

      setBlocks(prev => {
        if (prev.length <= 1) return prev;
        const prevBlock = prev[index - 1];
        const updatedBlocks = prev.filter(b => b.id !== block.id);
        triggerSave(titleRef.current, iconRef.current, coverRef.current, updatedBlocks);
        if (prevBlock) {
          setFocusedBlockId(prevBlock.id);
        }
        return updatedBlocks;
      });
    }

    if (e.key === 'Escape') {
      setActiveMenuIndex(null);
    }
  }, [handleSelectBlockType, triggerSave]);

  const selectCoverPreset = (preset: string) => {
    setCover(preset);
    setShowCoverPicker(false);
    triggerSave(titleRef.current, iconRef.current, preset, blocks);
  };

  const selectEmojiPreset = (emoji: string) => {
    setIcon(emoji);
    setShowEmojiPicker(false);
    triggerSave(titleRef.current, emoji, coverRef.current, blocks);
  };

  const handleDeleteBlock = useCallback((idx: number) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev;
      const updated = [...prev];
      const removedBlock = updated[idx];
      const prevBlock = updated[idx - 1] || updated[idx + 1];

      updated.splice(idx, 1);
      triggerSave(titleRef.current, iconRef.current, coverRef.current, updated);

      if (prevBlock && focusedBlockIdRef.current === removedBlock.id) {
        setFocusedBlockId(prevBlock.id);
      }
      return updated;
    });
  }, [triggerSave]);

  const handleAddBlockBelow = useCallback((idx: number) => {
    const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setBlocks(prev => {
      const updated = [...prev];
      updated.splice(idx + 1, 0, {
        id: newBlockId,
        type: 'text',
        data: { text: '' }
      });
      triggerSave(titleRef.current, iconRef.current, coverRef.current, updated);
      return updated;
    });
    setFocusedBlockId(newBlockId);
  }, [triggerSave]);

  const handleToggleFavorite = () => {
    onSavePage({ isFavorite: !isFavorite });
  };

  const coverStyle = cover
    ? cover.startsWith('linear-gradient') || cover.startsWith('#')
      ? { background: cover }
      : { backgroundImage: `url(${cover})` }
    : {};

  const contextValue = useMemo<EditorContextType>(() => ({
    setFocusedBlockId,
    handleTodoToggle,
    handleKeyDown,
    handleBlockChange,
    handleSelectBlockType,
    BLOCK_TYPES,
    onNavigate: onSelectPage,
    onDeleteBlock: handleDeleteBlock,
    onAddBlockBelow: handleAddBlockBelow
  }), [
    setFocusedBlockId,
    handleTodoToggle,
    handleKeyDown,
    handleBlockChange,
    handleSelectBlockType,
    onSelectPage,
    handleDeleteBlock,
    handleAddBlockBelow
  ]);

  return (
    <EditorContext.Provider value={contextValue}>
      <div className="editor-wrapper">
        {cover && (
          <div className="cover-wrapper" style={coverStyle} ref={coverPickerRef} onClick={() => setShowCoverPicker(true)}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCover(null);
                triggerSave(title, icon, null, blocks);
              }}
              className="remove-cover-btn"
            >
              Remove Cover
            </button>

            {showCoverPicker && (
              <div className="menu-popover glass-panel" style={{ top: '80px', right: '24px', left: 'auto', width: '240px' }} onClick={(e) => e.stopPropagation()}>
                <div className="menu-header">Preset Covers</div>
                <div className="presets-grid">
                  {COVER_PRESETS.map((preset, i) => (
                    <div
                      key={i}
                      onClick={() => selectCoverPreset(preset)}
                      className="presets-item"
                      style={preset.startsWith('linear-gradient') || preset.startsWith('#') ? { background: preset } : { backgroundImage: `url(${preset})` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="document-body">
          <div className="meta-row">
            <div className="save-status">
              {saving ? (
                <span style={{ color: 'var(--text-muted)' }}>Saving...</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Saved</span>
              )}
            </div>

            <button onClick={handleToggleFavorite} className="favorite-btn">
              <StarIcon size={16} fill={isFavorite ? 'var(--warning)' : 'none'} style={{ color: isFavorite ? 'var(--warning)' : 'var(--text-muted)' }} />
            </button>
          </div>

          <div className="actions-bar">
            {!icon && (
              <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                <button onClick={() => setShowEmojiPicker(true)} className="meta-action-btn">
                  😀 Add Icon
                </button>
                {showEmojiPicker && (
                  <div className="menu-popover glass-panel" style={{ top: '28px', left: '0', width: '230px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="menu-header">Emojis</div>
                    <div className="emoji-grid">
                      {EMOJI_PRESETS.map((emoji) => (
                        <div key={emoji} onClick={() => selectEmojiPreset(emoji)} className="emoji-grid-item">
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!cover && (
              <div style={{ position: 'relative' }} ref={coverPickerRef}>
                <button onClick={() => setShowCoverPicker(true)} className="meta-action-btn">
                  🖼️ Add Cover
                </button>
                {showCoverPicker && (
                  <div className="menu-popover glass-panel" style={{ top: '28px', left: '0', width: '240px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="menu-header">Preset Covers</div>
                    <div className="presets-grid">
                      {COVER_PRESETS.map((preset, i) => (
                        <div
                          key={i}
                          onClick={() => selectCoverPreset(preset)}
                          className="presets-item"
                          style={preset.startsWith('linear-gradient') || preset.startsWith('#') ? { background: preset } : { backgroundImage: `url(${preset})` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {icon && (
            <div className="emoji-display" style={{ position: 'relative' }} ref={emojiPickerRef}>
              <span className="emoji-active" onClick={() => setShowEmojiPicker(true)} title="Change Emoji">
                {icon}
              </span>
              <button
                onClick={() => {
                  setIcon(null);
                  triggerSave(title, null, cover, blocks);
                }}
                className="remove-emoji-btn"
              >
                Remove
              </button>

              {showEmojiPicker && (
                <div className="menu-popover glass-panel" style={{ top: '68px', left: '0', width: '230px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="menu-header">Emojis</div>
                  <div className="emoji-grid">
                    {EMOJI_PRESETS.map((emoji) => (
                      <div key={emoji} onClick={() => selectEmojiPreset(emoji)} className="emoji-grid-item">
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Untitled Page"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="title-input"
          />

          <div className="blocks-list">
            {blocks.map((block, index) => (
              <BlockItem
                key={block.id}
                block={block}
                index={index}
                isFocused={focusedBlockId === block.id}
                isMenuOpen={activeMenuIndex === index}
                menuSearch={menuSearch}
              />
            ))}
          </div>
        </div>
      </div>
    </EditorContext.Provider>
  );
};
