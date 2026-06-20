import React, { useRef, useEffect } from 'react';
import { DragIcon, PlusIcon, TrashIcon } from './Icons';
import { Block } from '../context/EditorContext';
import { useEditor } from '../context/EditorContext';

interface EditableBlockProps {
  initialHtml: string;
  isFocused: boolean;
  onChange: (html: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  className: string;
}

const EditableBlock: React.FC<EditableBlockProps> = ({
  initialHtml,
  isFocused,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder,
  className
}) => {
  const elementRef = useRef<HTMLDivElement | null>(null);

  // Sync content with backend updates when different from current DOM
  useEffect(() => {
    if (elementRef.current && elementRef.current.innerHTML !== initialHtml) {
      elementRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  // Declaratively manage focus and caret placement to eliminate parent refs and timeouts
  useEffect(() => {
    if (isFocused && elementRef.current && document.activeElement !== elementRef.current) {
      elementRef.current.focus();
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(elementRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isFocused]);

  return (
    <div
      ref={elementRef}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      data-placeholder={placeholder}
      className={className}
    />
  );
};

interface BlockItemProps {
  block: Block;
  index: number;
  isFocused: boolean;
  isMenuOpen: boolean;
  menuSearch: string;
}

const BlockItemComponent: React.FC<BlockItemProps> = ({ block, index, isFocused, isMenuOpen, menuSearch }) => {
  const {
    setFocusedBlockId,
    handleTodoToggle,
    handleKeyDown,
    handleBlockChange,
    handleSelectBlockType,
    onAddBlockBelow,
    onDeleteBlock,
    onNavigate,
    BLOCK_TYPES
  } = useEditor();

  return (
    <div className="block-row block-container">
      <div className="block-handle block-handle-hover">
        <DragIcon size={14} />
        <button
          onClick={() => onAddBlockBelow(index)}
          className="block-mini-add"
          title="Insert block below"
        >
          <PlusIcon size={12} />
        </button>
        <button
          onClick={() => onDeleteBlock(index)}
          className="block-mini-add"
          style={{ color: 'var(--error)' }}
          title="Delete block"
        >
          <TrashIcon size={12} />
        </button>
      </div>

      <div className="block-content-wrapper">
        {block.type === 'subpage' ? (
          <div
            onClick={() => onNavigate && block.data.pageId && onNavigate(block.data.pageId)}
            className="inline-subpage-link"
          >
            <span className="subpage-icon-emoji">📄</span>
            <span className="subpage-link-title">
              {block.data.text || 'Untitled Subpage'}
            </span>
          </div>
        ) : (
          <>
            {block.type === 'todo' && (
              <input
                type="checkbox"
                checked={block.data.checked || false}
                onChange={() => handleTodoToggle(block.id)}
                className="todo-checkbox"
              />
            )}

            {block.type === 'bullet' && <span className="bullet-node">•</span>}
            {block.type === 'numbered' && (
              <span className="numbered-node">{index + 1}.</span>
            )}

            <EditableBlock
              initialHtml={block.data.text}
              isFocused={isFocused}
              onChange={(html) => handleBlockChange(block.id, html)}
              onKeyDown={(e) => handleKeyDown(e, index, block)}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={() => {
                setTimeout(() => {
                  setFocusedBlockId(prev => prev === block.id ? null : prev);
                }, 150);
              }}
              placeholder="Type '/' for commands..."
              className={`editable-block block-type-${block.type} ${
                block.type === 'todo' && block.data.checked ? 'todo-checked' : ''
              }`}
            />
          </>
        )}
      </div>

      {isMenuOpen && (
        <div className="menu-popover glass-panel">
          <div className="menu-header">Basic Blocks</div>
          <div className="menu-list">
            {BLOCK_TYPES.filter(t => t.label.toLowerCase().includes(menuSearch.toLowerCase())).map(t => (
              <div
                key={t.type}
                onClick={() => handleSelectBlockType(index, t.type)}
                className="menu-item menu-item-hover"
              >
                <span className="menu-item-icon">{t.icon}</span>
                <div className="menu-item-texts">
                  <div className="menu-item-label">{t.label}</div>
                  <div className="menu-item-desc">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const BlockItem = React.memo(BlockItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.type === nextProps.block.type &&
    prevProps.block.data.text === nextProps.block.data.text &&
    prevProps.block.data.checked === nextProps.block.data.checked &&
    prevProps.block.data.language === nextProps.block.data.language &&
    prevProps.index === nextProps.index &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.isMenuOpen === nextProps.isMenuOpen &&
    prevProps.menuSearch === nextProps.menuSearch
  );
});
