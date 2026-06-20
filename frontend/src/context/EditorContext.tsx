import { createContext, useContext } from 'react';

export interface Block {
  id: string;
  type: 'text' | 'heading1' | 'heading2' | 'heading3' | 'todo' | 'bullet' | 'numbered' | 'code' | 'quote' | 'subpage';
  data: {
    text: string;
    checked?: boolean;
    language?: string;
    pageId?: string;
  };
}

export interface EditorContextType {
  setFocusedBlockId: (val: string | null | ((prev: string | null) => string | null)) => void;
  handleTodoToggle: (blockId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, index: number, block: Block) => void;
  handleBlockChange: (blockId: string, text: string) => void;
  handleSelectBlockType: (index: number, type: Block['type']) => Promise<void>;
  onAddBlockBelow: (index: number) => void;
  onDeleteBlock: (index: number) => void;
  onNavigate?: (pageId: string) => void;
  BLOCK_TYPES: readonly { readonly type: Block['type']; readonly label: string; readonly desc: string; readonly icon: string }[];
}

export const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
