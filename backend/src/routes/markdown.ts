import { Router } from 'express'
import { markdownService } from '../services/markdownService'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Export Markdown to PDF
router.post('/export/pdf', authenticateToken, async (req, res) => {
  try {
    const { content, filename } = req.body
    const pdf = await markdownService.exportToPdf(content, filename)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
    res.send(pdf)
  } catch (error) {
    res.status(500).json({ error: 'Export failed' })
  }
})

// Get Markdown templates
router.get('/templates', authenticateToken, async (req, res) => {
  // Implementation for fetching templates
  res.status(501).json({ message: 'Not Implemented' })
})

// Create Markdown template
router.post('/templates', authenticateToken, async (req, res) => {
  // Implementation for creating templates
  res.status(501).json({ message: 'Not Implemented' })
})

export default router
