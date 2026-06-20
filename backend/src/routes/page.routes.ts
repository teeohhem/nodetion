import { Router } from 'express';
import {
  createPage,
  getPages,
  getPageById,
  updatePage,
  deletePage,
  getArchivedPages,
  searchPages
} from '../controllers/page.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createPage);
router.get('/', getPages);
router.get('/archived', getArchivedPages);
router.get('/search', searchPages);
router.get('/:id', getPageById);
router.put('/:id', updatePage);
router.delete('/:id', deletePage);

export default router;
