import jwt from 'jsonwebtoken'
import RoleAssignment from '../models/RoleAssignment.js'
import Store from '../models/Store.js'

/**
 * Middleware que verifica el token JWT y adjunta al request:
 *   req.analyticsContext = { brandId, storeIds, isBrandAdmin }
 *
 * - brandId   : la marca del usuario autenticado
 * - storeIds  : array de IDs de tiendas accesibles (todas las de la marca si es brand-admin)
 * - isBrandAdmin: true si el usuario administra toda la marca
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de autorización requerido' })
    }

    const token = authHeader.split(' ')[1]

    let payload
    try {
      payload = jwt.verify(token, process.env.jwtSecret)
    } catch {
      return res.status(401).json({ message: 'Token inválido o expirado' })
    }

    const { userId } = payload

    if (!userId) {
      return res.status(401).json({ message: 'Token sin userId' })
    }

    // Obtener asignaciones de roles para determinar brand y tiendas accesibles
    const assignments = await RoleAssignment.find({ userId })

    if (!assignments.length) {
      return res.status(403).json({ message: 'El usuario no tiene roles asignados' })
    }

    const brandId = assignments[0].brandId
    const isBrandAdmin = assignments.some(a => a.scope?.type === 'brand')

    let storeIds = []

    if (isBrandAdmin) {
      // Admin de marca: accede a todas las tiendas de la marca
      const stores = await Store.find({ brandId }).select('_id').lean()
      storeIds = stores.map(s => s._id)
    } else {
      // Admin de tienda: solo sus tiendas asignadas
      storeIds = assignments
        .filter(a => a.scope?.type === 'store' && a.scope?.targetId)
        .map(a => a.scope.targetId)
    }

    req.analyticsContext = { brandId, storeIds, isBrandAdmin }
    next()
  } catch (error) {
    console.error('Error en authMiddleware:', error)
    res.status(500).json({ message: 'Error al autenticar', error: error.message })
  }
}
