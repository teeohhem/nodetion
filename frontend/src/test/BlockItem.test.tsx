import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockItem } from '../components/BlockItem';
import { EditorContext, EditorContextType, Block } from '../context/EditorContext';

describe('BlockItem Component', () => {
  let mockContext: EditorContextType;

  beforeEach(() => {
    mockContext = {
      setFocusedBlockId: vi.fn(),
      handleTodoToggle: vi.fn(),
      handleKeyDown: vi.fn(),
      handleBlockChange: vi.fn(),
      handleSelectBlockType: vi.fn(),
      onAddBlockBelow: vi.fn(),
      onDeleteBlock: vi.fn(),
      onNavigate: vi.fn(),
      BLOCK_TYPES: [
        { type: 'text', label: 'Text', desc: 'Plain writing', icon: '✍️' },
        { type: 'todo', label: 'To-do List', desc: 'Checkbox items', icon: '☑️' }
      ] as any
    };
  });

  it('should render a text block content correctly', () => {
    const block: Block = {
      id: 'block-1',
      type: 'text',
      data: { text: 'Hello Nodetion' }
    };

    render(
      <EditorContext.Provider value={mockContext}>
        <BlockItem block={block} index={0} isFocused={false} isMenuOpen={false} menuSearch="" />
      </EditorContext.Provider>
    );

    const blockEl = screen.getByText('Hello Nodetion');
    expect(blockEl).toBeInTheDocument();
    expect(blockEl).toHaveClass('block-type-text');
  });

  it('should render a todo block and toggle checkbox status', () => {
    const block: Block = {
      id: 'block-todo',
      type: 'todo',
      data: { text: 'Complete Vitest tests', checked: false }
    };

    render(
      <EditorContext.Provider value={mockContext}>
        <BlockItem block={block} index={0} isFocused={false} isMenuOpen={false} menuSearch="" />
      </EditorContext.Provider>
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(mockContext.handleTodoToggle).toHaveBeenCalledWith('block-todo');
  });

  it('should call handleBlockChange on text input', () => {
    const block: Block = {
      id: 'block-1',
      type: 'text',
      data: { text: 'Initial text' }
    };

    render(
      <EditorContext.Provider value={mockContext}>
        <BlockItem block={block} index={0} isFocused={false} isMenuOpen={false} menuSearch="" />
      </EditorContext.Provider>
    );

    const blockEl = screen.getByText('Initial text');
    fireEvent.input(blockEl, { target: { innerHTML: 'Modified text' } });

    expect(mockContext.handleBlockChange).toHaveBeenCalledWith('block-1', 'Modified text');
  });

  it('should display the slash command menu popover when isMenuOpen is true', () => {
    const block: Block = {
      id: 'block-1',
      type: 'text',
      data: { text: 'hello/' }
    };

    render(
      <EditorContext.Provider value={mockContext}>
        <BlockItem block={block} index={0} isFocused={true} isMenuOpen={true} menuSearch="" />
      </EditorContext.Provider>
    );

    expect(screen.getByText('Basic Blocks')).toBeInTheDocument();
    expect(screen.getByText('To-do List')).toBeInTheDocument();
  });

  it('should render heading block types with proper CSS classes', () => {
    const types: Block['type'][] = ['heading1', 'heading2', 'heading3', 'quote', 'code'];
    
    types.forEach((type, index) => {
      const block: Block = {
        id: `block-${type}`,
        type,
        data: { text: `My ${type}` }
      };

      render(
        <EditorContext.Provider value={mockContext}>
          <BlockItem block={block} index={index} isFocused={false} isMenuOpen={false} menuSearch="" />
        </EditorContext.Provider>
      );

      const blockEl = screen.getByText(`My ${type}`);
      expect(blockEl).toBeInTheDocument();
      expect(blockEl).toHaveClass(`block-type-${type}`);
    });
  });

  it('should render block handles structure correctly for hover styling', () => {
    const block: Block = {
      id: 'block-handle-test',
      type: 'text',
      data: { text: 'Testing block handles' }
    };

    const { container } = render(
      <EditorContext.Provider value={mockContext}>
        <BlockItem block={block} index={0} isFocused={false} isMenuOpen={false} menuSearch="" />
      </EditorContext.Provider>
    );

    const rowEl = container.querySelector('.block-row');
    expect(rowEl).toBeInTheDocument();
    expect(rowEl).toHaveClass('block-container');

    const handleEl = container.querySelector('.block-handle');
    expect(handleEl).toBeInTheDocument();
    expect(handleEl).toHaveClass('block-handle-hover');

    const addBtn = screen.getByTitle('Insert block below');
    const deleteBtn = screen.getByTitle('Delete block');
    expect(addBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
  });
});
