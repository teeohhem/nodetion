import { Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middleware/auth';

const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'a', 'code', 'span'],
  allowedAttributes: {
    'a': ['href', 'target'],
    'span': ['class', 'style']
  }
};

const sanitizeBlockContent = (contentString: string): string => {
  try {
    const blocks = JSON.parse(contentString);
    if (!Array.isArray(blocks)) return '[]';

    const sanitized = blocks.map((block: any) => {
      if (block?.data && typeof block.data.text === 'string') {
        block.data.text = sanitizeHtml(block.data.text, sanitizeOptions);
      }
      return block;
    });

    return JSON.stringify(sanitized);
  } catch {
    return '[]';
  }
};

const createPageSchema = z.object({
  title: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().nullable().optional(),
  cover: z.string().nullable().optional()
});

const updatePageSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  icon: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional()
});

export const createPage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const validated = createPageSchema.parse(req.body);
    const { title, parentId, icon, cover } = validated;

    if (parentId) {
      const parentPage = await prisma.page.findFirst({
        where: { id: parentId, userId }
      });
      if (!parentPage) {
        return res.status(400).json({ message: 'Parent page invalid or access denied' });
      }
    }

    const page = await prisma.page.create({
      data: {
        title: title || 'Untitled',
        userId,
        parentId: parentId || null,
        icon: icon || null,
        cover: cover || null,
        content: '[]'
      }
    });

    return res.status(201).json(page);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Create page error:', error);
    return res.status(500).json({ message: 'Failed to create page' });
  }
};

export const getPages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const pages = await prisma.page.findMany({
      where: { userId, isArchived: false },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
        isFavorite: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json(pages);
  } catch (error) {
    console.error('Get pages error:', error);
    return res.status(500).json({ message: 'Failed to fetch pages' });
  }
};

export const getArchivedPages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const pages = await prisma.page.findMany({
      where: { userId, isArchived: true },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true
      }
    });

    return res.json(pages);
  } catch (error) {
    console.error('Get archived pages error:', error);
    return res.status(500).json({ message: 'Failed to fetch archived pages' });
  }
};

export const getPageById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page = await prisma.page.findFirst({
      where: { id, userId }
    });

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    return res.json(page);
  } catch (error) {
    console.error('Get page error:', error);
    return res.status(500).json({ message: 'Failed to load page content' });
  }
};

export const updatePage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const validated = updatePageSchema.parse(req.body);
    const { title, content, icon, cover, isFavorite, isArchived, parentId } = validated;

    const page = await prisma.page.findFirst({
      where: { id, userId }
    });

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    if (parentId && parentId !== page.parentId) {
      if (parentId === id) {
        return res.status(400).json({ message: 'A page cannot be its own parent' });
      }

      const parentPage = await prisma.page.findFirst({
        where: { id: parentId, userId }
      });
      if (!parentPage) {
        return res.status(400).json({ message: 'New parent page invalid or access denied' });
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (icon !== undefined) updateData.icon = icon;
    if (cover !== undefined) updateData.cover = cover;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (content !== undefined) {
      updateData.content = sanitizeBlockContent(content);
    }

    const updated = await prisma.page.update({
      where: { id },
      data: updateData
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Update page error:', error);
    return res.status(500).json({ message: 'Failed to update page' });
  }
};

export const deletePage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page = await prisma.page.findFirst({
      where: { id, userId }
    });

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    await prisma.page.delete({
      where: { id }
    });

    return res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Delete page error:', error);
    return res.status(500).json({ message: 'Failed to delete page' });
  }
};

export const searchPages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { q } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const query = typeof q === 'string' ? q.trim() : '';
    if (!query) {
      return res.json([]);
    }

    const pages = await prisma.page.findMany({
      where: {
        userId,
        isArchived: false,
        OR: [
          { title: { contains: query } },
          { content: { contains: query } }
        ]
      },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
        content: true
      },
      take: 20
    });

    const results = pages.map(page => {
      let matchType: 'title' | 'content' = 'title';
      let snippet = '';

      if (!page.title.toLowerCase().includes(query.toLowerCase())) {
        matchType = 'content';
        try {
          const blocks = JSON.parse(page.content);
          if (Array.isArray(blocks)) {
            const matchBlock = blocks.find((b: any) =>
              b?.data?.text?.toLowerCase().includes(query.toLowerCase())
            );
            if (matchBlock) {
              const text = matchBlock.data.text.replace(/<[^>]*>/g, '');
              const idx = text.toLowerCase().indexOf(query.toLowerCase());
              const start = Math.max(0, idx - 30);
              const end = Math.min(text.length, idx + query.length + 30);
              snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      return {
        id: page.id,
        title: page.title,
        icon: page.icon,
        parentId: page.parentId,
        matchType,
        snippet
      };
    });

    return res.json(results);
  } catch (error) {
    console.error('Search pages error:', error);
    return res.status(500).json({ message: 'Failed to search pages' });
  }
};
