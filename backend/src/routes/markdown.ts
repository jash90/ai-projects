import { Router, Request, Response } from 'express'
import { markdownService } from '../services/markdownService'
import { authenticateToken } from '../middleware/auth'

const router: Router = Router()

/**
 * @swagger
 * /api/markdown/export/pdf:
 *   post:
 *     summary: Export markdown to PDF
 *     tags: [Markdown]
 *     description: Convert markdown content to PDF format
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkdownExportRequest'
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/export/pdf', authenticateToken, async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /api/markdown/templates:
 *   get:
 *     summary: Get markdown templates
 *     tags: [Markdown]
 *     description: Retrieve available markdown templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MarkdownTemplate'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       501:
 *         description: Not implemented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/templates', authenticateToken, async (req: Request, res: Response) => {
  // Implementation for fetching templates
  res.status(501).json({ message: 'Not Implemented' })
})

/**
 * @swagger
 * /api/markdown/templates:
 *   post:
 *     summary: Create markdown template
 *     tags: [Markdown]
 *     description: Create a new markdown template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MarkdownTemplate'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       501:
 *         description: Not implemented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/templates', authenticateToken, async (req: Request, res: Response) => {
  // Implementation for creating templates
  res.status(501).json({ message: 'Not Implemented' })
})

export default router
