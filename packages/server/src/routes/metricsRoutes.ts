import { Router } from 'express'
const router = Router()

router.get('/lifecycle/funnel', (req, res) => res.json({ success: true, data: { stages: [] } }))

export { router as metricsRoutes }
