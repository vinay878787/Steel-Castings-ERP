import { Router, Response, Request } from 'express';
import ColumnConfig, { CONFIGURABLE_ENTITIES } from '../models/ColumnConfig';
import { protect, authorize } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { entity } = req.query;
  const filter = entity ? { entity } : {};
  const configs = await ColumnConfig.find(filter).sort({ order: 1 });
  res.json(configs);
});

router.post('/', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  const { entity, fieldName } = req.body;
  if (!entity || !CONFIGURABLE_ENTITIES.includes(entity)) {
    res.status(400).json({ message: 'Invalid entity' }); return;
  }
  const normalized = String(fieldName).toLowerCase().replace(/\s+/g, '_').trim();
  const exists = await ColumnConfig.findOne({ entity, fieldName: normalized });
  if (exists) {
    res.status(409).json({ message: `A field with key "${normalized}" already exists for this entity` }); return;
  }
  const count = await ColumnConfig.countDocuments({ entity });
  const config = await ColumnConfig.create({ ...req.body, fieldName: normalized, order: count });
  res.status(201).json(config);
});

router.put('/:id', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  const config = await ColumnConfig.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!config) { res.status(404).json({ message: 'Config not found' }); return; }
  res.json(config);
});

router.delete('/:id', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  await ColumnConfig.findByIdAndDelete(req.params.id);
  res.json({ message: 'Column deleted' });
});

export default router;
