import { Router, Response } from 'express';
import FinishedGoods from '../models/FinishedGoods';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req, res: Response): Promise<void> => {
  const { search } = req.query;
  let query = FinishedGoods.find()
    .populate('product', 'productName productCode unit sellingPrice')
    .sort({ updatedAt: -1 });
  const goods = await query;
  if (search) {
    const filtered = goods.filter((g) => {
      const p = g.product as { productName?: string; productCode?: string };
      const s = (search as string).toLowerCase();
      return p.productName?.toLowerCase().includes(s) || p.productCode?.toLowerCase().includes(s);
    });
    res.json(filtered);
    return;
  }
  res.json(goods);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const fg = await FinishedGoods.findById(req.params.id).populate('product', 'productName productCode unit sellingPrice standardCost');
  if (!fg) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json(fg);
});

export default router;
