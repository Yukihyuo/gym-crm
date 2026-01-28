import express from 'express';
import Role from '../models/Role.js';

const router = express.Router();

// Create - Crear un nuevo rol
router.post('/create', async (req, res) => {
  try {
    const { name, modules } = req.body;

    // Validar campos requeridos
    if (!name) {
      return res.status(400).json({ 
        message: 'El nombre del rol es requerido' 
      });
    }

    // Verificar si el rol ya existe
    const existingRole = await Role.findOne({ name });
    
    if (existingRole) {
      return res.status(400).json({ 
        message: 'El rol ya existe' 
      });
    }

    // Crear el nuevo rol
    const newRole = new Role({
      name,
      modules: modules || []
    });

    await newRole.save();

    res.status(201).json({ 
      message: 'Rol creado exitosamente',
      role: newRole
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({ 
      message: 'Error al crear rol', 
      error: error.message 
    });
  }
});

// GetAll - Obtener todos los roles
router.get('/getAll', async (req, res) => {
  try {
    const roles = await Role.find();

    res.status(200).json({
      message: 'Roles obtenidos exitosamente',
      count: roles.length,
      roles: roles
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({ 
      message: 'Error al obtener roles', 
      error: error.message 
    });
  }
});

// GetById - Obtener un rol por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    
    if (!role) {
      return res.status(404).json({ 
        message: 'Rol no encontrado' 
      });
    }

    res.status(200).json({
      message: 'Rol obtenido exitosamente',
      role: role
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({ 
      message: 'Error al obtener rol', 
      error: error.message 
    });
  }
});

// Update - Actualizar un rol
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, modules } = req.body;

    // Buscar el rol
    const role = await Role.findById(id);
    
    if (!role) {
      return res.status(404).json({ 
        message: 'Rol no encontrado' 
      });
    }

    // Si se quiere cambiar el nombre, verificar que no exista otro rol con ese nombre
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name });
      
      if (existingRole) {
        return res.status(400).json({ 
          message: 'Ya existe un rol con ese nombre' 
        });
      }
      role.name = name;
    }

    // Actualizar módulos si se proporcionan
    if (modules !== undefined) {
      role.modules = modules;
    }

    await role.save();

    res.status(200).json({
      message: 'Rol actualizado exitosamente',
      role: role
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({ 
      message: 'Error al actualizar rol', 
      error: error.message 
    });
  }
});

// Delete - Eliminar un rol
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByIdAndDelete(id);
    
    if (!role) {
      return res.status(404).json({ 
        message: 'Rol no encontrado' 
      });
    }

    res.status(200).json({
      message: 'Rol eliminado exitosamente',
      role: role
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({ 
      message: 'Error al eliminar rol', 
      error: error.message 
    });
  }
});

export default router;

