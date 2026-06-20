import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/db';

describe('Page API Routes', () => {
  const generateUser = (name: string) => ({
    email: `${name.toLowerCase().replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`,
    password: 'password123',
    name
  });

  const createAuthenticatedSession = async (userData: { email: string; password: string; name: string }) => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(userData);
    expect(registerRes.status).toBe(201);
    return registerRes.headers['set-cookie'] || [];
  };

  describe('POST /api/pages', () => {
    it('should block unauthorized requests', async () => {
      const res = await request(app).post('/api/pages').send({ title: 'New' });
      expect(res.status).toBe(401);
    });

    it('should create a new root page for the authenticated user', async () => {
      const user = generateUser('User Root');
      const cookie = await createAuthenticatedSession(user);

      const res = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'My Root Page' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('My Root Page');
      expect(res.body.parentId).toBeNull();
      expect(res.body.content).toBe('[]');
    });

    it('should create a nested subpage validation successfully', async () => {
      const user = generateUser('User Subpage');
      const cookie = await createAuthenticatedSession(user);

      // Create parent
      const parentRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Parent Page' });
      expect(parentRes.status).toBe(201);
      const parentId = parentRes.body.id;

      // Create child
      const childRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Subpage', parentId });

      expect(childRes.status).toBe(201);
      expect(childRes.body.parentId).toBe(parentId);
    });

    it('should reject nested subpage creation if the parent page belongs to another user', async () => {
      const userA = generateUser('User A');
      const userB = generateUser('User B');
      const cookieA = await createAuthenticatedSession(userA);
      const cookieB = await createAuthenticatedSession(userB);

      // User A creates a page
      const pageARes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookieA)
        .send({ title: 'User A Page' });
      expect(pageARes.status).toBe(201);
      const pageAId = pageARes.body.id;

      // User B tries to nest under User A's page
      const res = await request(app)
        .post('/api/pages')
        .set('Cookie', cookieB)
        .send({ title: 'User B Subpage', parentId: pageAId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('invalid or access denied');
    });
  });

  describe('GET /api/pages', () => {
    it('should only return non-archived pages owned by the authenticated user', async () => {
      const userA = generateUser('User A Get');
      const userB = generateUser('User B Get');
      const cookieA = await createAuthenticatedSession(userA);
      const cookieB = await createAuthenticatedSession(userB);

      // User A page
      await request(app)
        .post('/api/pages')
        .set('Cookie', cookieA)
        .send({ title: 'Page A' });

      // User B page
      await request(app)
        .post('/api/pages')
        .set('Cookie', cookieB)
        .send({ title: 'Page B' });

      const res = await request(app)
        .get('/api/pages')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Page A');
    });
  });

  describe('PUT /api/pages/:id', () => {
    it('should update page content, applying HTML sanitization to code blocks', async () => {
      const user = generateUser('User Update');
      const cookie = await createAuthenticatedSession(user);

      const pageRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Raw Page' });
      const pageId = pageRes.body.id;

      const maliciousContent = JSON.stringify([
        {
          id: 'block-1',
          type: 'text',
          data: {
            text: 'Hello <script>alert("hack")</script>and <strong>strong text</strong>'
          }
        }
      ]);

      const res = await request(app)
        .put(`/api/pages/${pageId}`)
        .set('Cookie', cookie)
        .send({
          title: 'Sanitized Title',
          content: maliciousContent
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Sanitized Title');
      
      const parsedContent = JSON.parse(res.body.content);
      expect(parsedContent[0].data.text).not.toContain('<script>');
      expect(parsedContent[0].data.text).toContain('Hello and <strong>strong text</strong>');
    });

    it('should preserve formatting tags like br, p, and div in content sanitization', async () => {
      const user = generateUser('User Formatter');
      const cookie = await createAuthenticatedSession(user);

      const pageRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Multiline Page' });
      const pageId = pageRes.body.id;

      const multilineContent = JSON.stringify([
        {
          id: 'block-1',
          type: 'text',
          data: {
            text: 'Line 1<br>Line 2<p>Line 3</p><div>Line 4</div><script>alert(1)</script>'
          }
        }
      ]);

      const res = await request(app)
        .put(`/api/pages/${pageId}`)
        .set('Cookie', cookie)
        .send({
          content: multilineContent
        });

      expect(res.status).toBe(200);
      const parsed = JSON.parse(res.body.content);
      const text = parsed[0].data.text;
      
      expect(text).toContain('Line 1<br />Line 2');
      expect(text).toContain('<p>Line 3</p>');
      expect(text).toContain('<div>Line 4</div>');
      expect(text).not.toContain('<script>');
    });

    it('should forbid updates to pages owned by other users', async () => {
      const userA = generateUser('User A Forbid');
      const userB = generateUser('User B Forbid');
      const cookieA = await createAuthenticatedSession(userA);
      const cookieB = await createAuthenticatedSession(userB);

      const pageRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookieA)
        .send({ title: 'User A Page' });
      const pageId = pageRes.body.id;

      const res = await request(app)
        .put(`/api/pages/${pageId}`)
        .set('Cookie', cookieB)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/pages/search', () => {
    it('should search pages by matching title or text contents', async () => {
      const user = generateUser('User Search');
      const cookie = await createAuthenticatedSession(user);

      // Create matching pages
      await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Special Javascript Tutorial' });

      const pageRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Vite Guide' });
      
      // Update page with nested matching block text
      const content = JSON.stringify([
        { id: 'b1', type: 'text', data: { text: 'Learning typescript is fun' } }
      ]);
      await request(app)
        .put(`/api/pages/${pageRes.body.id}`)
        .set('Cookie', cookie)
        .send({ content });

      // Search matching title
      const resTitle = await request(app)
        .get('/api/pages/search?q=javascript')
        .set('Cookie', cookie);

      expect(resTitle.status).toBe(200);
      expect(resTitle.body.length).toBe(1);
      expect(resTitle.body[0].title).toBe('Special Javascript Tutorial');

      // Search matching block content
      const resContent = await request(app)
        .get('/api/pages/search?q=typescript')
        .set('Cookie', cookie);

      expect(resContent.status).toBe(200);
      expect(resContent.body.length).toBe(1);
      expect(resContent.body[0].title).toBe('Vite Guide');
    });
  });

  describe('Trash and Archive Lifecycle', () => {
    it('should archive, list in trash, restore, and delete pages', async () => {
      const user = generateUser('User Trash');
      const cookie = await createAuthenticatedSession(user);

      const pageRes = await request(app)
        .post('/api/pages')
        .set('Cookie', cookie)
        .send({ title: 'Trash Demo' });
      const pageId = pageRes.body.id;

      // 1. Archive
      await request(app)
        .put(`/api/pages/${pageId}`)
        .set('Cookie', cookie)
        .send({ isArchived: true });

      // Check not in active list
      const activeRes = await request(app).get('/api/pages').set('Cookie', cookie);
      expect(activeRes.body.some((p: any) => p.id === pageId)).toBe(false);

      // 2. Read from Archived (Trash list)
      const trashRes = await request(app).get('/api/pages/archived').set('Cookie', cookie);
      expect(trashRes.body.some((p: any) => p.id === pageId)).toBe(true);

      // 3. Restore
      await request(app)
        .put(`/api/pages/${pageId}`)
        .set('Cookie', cookie)
        .send({ isArchived: false });
      
      const restoredActiveRes = await request(app).get('/api/pages').set('Cookie', cookie);
      expect(restoredActiveRes.body.some((p: any) => p.id === pageId)).toBe(true);

      // 4. Delete permanently
      const deleteRes = await request(app).delete(`/api/pages/${pageId}`).set('Cookie', cookie);
      expect(deleteRes.status).toBe(200);

      // Verify not accessible at all
      const getDetailRes = await request(app).get(`/api/pages/${pageId}`).set('Cookie', cookie);
      expect(getDetailRes.status).toBe(404);
    });
  });
});
