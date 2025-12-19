import { Router } from 'express'
const router = Router()

router.get('/', (req, res) => res.json({ success: true, data: [] }))
router.post('/', (req, res) => res.json({ success: true, data: {} }))
router.post('/:id/evaluate', (req, res) => res.json({ success: true, data: { matches: false } }))

export { router as segmentRoutes }
