import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Editor } from '../components/Editor';
import { Block } from '../context/EditorContext';

describe('Editor Component', () => {
  const mockBlocks: Block[] = [
    { id: 'b1', type: 'text', data: { text: 'Paragraph one' } }
  ];

  let mockOnSavePage: any;

  beforeEach(() => {
    mockOnSavePage = vi.fn();
  });

  const renderEditor = () => {
    return render(
      <Editor
        pageId="p1"
        initialTitle="Awesome Doc"
        initialIcon="🚀"
        initialCover={null}
        initialBlocks={mockBlocks}
        isFavorite={false}
        onSavePage={mockOnSavePage}
        onSelectPage={vi.fn()}
      />
    );
  };

  it('should render document title and page blocks list', () => {
    renderEditor();
    const titleInput = screen.getByPlaceholderText('Untitled Page') as HTMLInputElement;
    expect(titleInput).toBeInTheDocument();
    expect(titleInput.value).toBe('Awesome Doc');
    expect(screen.getByText('Paragraph one')).toBeInTheDocument();
  });

  it('should handle updates to favorites star toggle', () => {
    renderEditor();
    const favoriteBtn = screen.getByRole('button', { name: '' }); // favorite btn is the star icon button
    fireEvent.click(favoriteBtn);
    expect(mockOnSavePage).toHaveBeenCalledWith({ isFavorite: true });
  });

  it('should show cover preset picker when cover actions are triggered', () => {
    renderEditor();
    const addCoverBtn = screen.getByText('🖼️ Add Cover');
    expect(addCoverBtn).toBeInTheDocument();
    
    fireEvent.click(addCoverBtn);
    expect(screen.getByText('Preset Covers')).toBeInTheDocument();
  });

  it('should continue checklist/list block type on Enter keypress', () => {
    const blocks: Block[] = [
      { id: 'todo-1', type: 'todo', data: { text: 'First todo', checked: false } }
    ];
    render(
      <Editor
        pageId="p1"
        initialTitle="Doc"
        initialIcon={null}
        initialCover={null}
        initialBlocks={blocks}
        isFavorite={false}
        onSavePage={mockOnSavePage}
      />
    );

    const editable = screen.getByText('First todo');
    fireEvent.keyDown(editable, { key: 'Enter' });

    // The editor should now have 2 checklist items in the DOM
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
  });

  it('should convert checklist/list block to text block on Enter when text is empty', () => {
    const blocks: Block[] = [
      { id: 'todo-empty', type: 'todo', data: { text: '', checked: false } }
    ];
    const { container } = render(
      <Editor
        pageId="p1"
        initialTitle="Doc"
        initialIcon={null}
        initialCover={null}
        initialBlocks={blocks}
        isFavorite={false}
        onSavePage={mockOnSavePage}
      />
    );

    const editable = container.querySelector('.editable-block')!;
    fireEvent.keyDown(editable, { key: 'Enter' });

    // Changing the type from todo to text removes the checkbox input element from DOM
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes.length).toBe(0);
  });

  it('should convert empty list block to text block on Backspace', () => {
    const blocks: Block[] = [
      { id: 'bullet-empty', type: 'bullet', data: { text: '' } }
    ];
    const { container } = render(
      <Editor
        pageId="p1"
        initialTitle="Doc"
        initialIcon={null}
        initialCover={null}
        initialBlocks={blocks}
        isFavorite={false}
        onSavePage={mockOnSavePage}
      />
    );

    const bulletMark = screen.getByText('•');
    expect(bulletMark).toBeInTheDocument();

    const editable = container.querySelector('.editable-block')!;
    fireEvent.keyDown(editable, { key: 'Backspace' });

    // Changing type to text removes the bullet point span from DOM
    expect(screen.queryByText('•')).not.toBeInTheDocument();
  });
});
