import express from 'express';
import Page from '../models/Page.js';
import Module from '../models/Module.js';

const router = express.Router();

// Create - Crear una nueva página con sus módulos
router.post('/create', async (req, res) => {
  try {
    const { name, path, moduleTypes } = req.body;
    console.log(req.body)
    // Validar campos requeridos
    if (!name || !path) {
      return res.status(400).json({ 
        message: 'El nombre y la ruta son requeridos' 
      });
    }

    // Verificar si la página ya existe
    const existingPage = await Page.findOne({ 
      $or: [{ name }, { path }] 
    });
    
    if (existingPage) {
      return res.status(400).json({ 
        message: 'Ya existe una página con ese nombre o ruta' 
      });
    }

    // Crear la nueva página
    const newPage = new Page({
      name,
      path,
      modules: []
    });

    await newPage.save();

    // Crear módulos si se proporcionaron
    if (moduleTypes && Array.isArray(moduleTypes) && moduleTypes.length > 0) {
      const validTypes = ['read', 'create', 'delete', 'update'];
      const moduleIds = [];

      for (const type of moduleTypes) {
        if (!validTypes.includes(type)) {
          await Page.findByIdAndDelete(newPage._id);
          return res.status(400).json({ 
            message: `Tipo de módulo inválido: ${type}. Debe ser: read, create, delete o update` 
          });
        }

        const newModule = new Module({
          pageId: newPage._id,
          type: type
        });

        await newModule.save();
        moduleIds.push(newModule._id);
      }

      // Actualizar la página con los IDs de los módulos
      newPage.modules = moduleIds;
      await newPage.save();
    }

    // Obtener la página con módulos poblados
    const pageWithModules = await Page.findById(newPage._id);
    const modules = await Module.find({ _id: { $in: pageWithModules.modules } });

    res.status(201).json({ 
      message: 'Página creada exitosamente',
      page: {
        ...pageWithModules.toObject(),
        moduleDetails: modules
      }
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({ 
      message: 'Error al crear página', 
      error: error.message 
    });
  }
});

// GetAll - Obtener todas las páginas
router.get('/getAll', async (req, res) => {
  try {
    const pages = await Page.find();
    
    // Obtener módulos para cada página
    const pagesWithModules = await Promise.all(
      pages.map(async (page) => {
        const modules = await Module.find({ pageId: page._id });
        return {
          ...page.toObject(),
          moduleDetails: modules
        };
      })
    );
    res.status(200).json({
      message: 'Páginas obtenidas exitosamente',
      count: pagesWithModules.length,
      pages: pagesWithModules
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({ 
      message: 'Error al obtener páginas', 
      error: error.message 
    });
  }
});

// GetById - Obtener una página por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id);
    
    if (!page) {
      return res.status(404).json({ 
        message: 'Página no encontrada' 
      });
    }

    // Obtener módulos asociados
    const modules = await Module.find({ pageId: page._id });

    res.status(200).json({
      message: 'Página obtenida exitosamente',
      page: {
        ...page.toObject(),
        moduleDetails: modules
      }
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({ 
      message: 'Error al obtener página', 
      error: error.message 
    });
  }
});

// Update - Actualizar una página
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path } = req.body;

    // Buscar la página
    const page = await Page.findById(id);
    
    if (!page) {
      return res.status(404).json({ 
        message: 'Página no encontrada' 
      });
    }

    // Si se quiere cambiar el nombre o ruta, verificar que no exista otra página con esos datos
    if (name && name !== page.name) {
      const existingPage = await Page.findOne({ name });
      if (existingPage) {
        return res.status(400).json({ 
          message: 'Ya existe una página con ese nombre' 
        });
      }
      page.name = name;
    }

    if (path && path !== page.path) {
      const existingPage = await Page.findOne({ path });
      if (existingPage) {
        return res.status(400).json({ 
          message: 'Ya existe una página con esa ruta' 
        });
      }
      page.path = path;
    }

    await page.save();

    // Obtener módulos asociados
    const modules = await Module.find({ _id: { $in: page.modules } });

    res.status(200).json({
      message: 'Página actualizada exitosamente',
      page: {
        ...page.toObject(),
        moduleDetails: modules
      }
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({ 
      message: 'Error al actualizar página', 
      error: error.message 
    });
  }
});

// Delete - Eliminar una página y sus módulos
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id);
    
    if (!page) {
      return res.status(404).json({ 
        message: 'Página no encontrada' 
      });
    }

    // Eliminar todos los módulos asociados
    await Module.deleteMany({ _id: { $in: page.modules } });

    // Eliminar la página
    await Page.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Página y sus módulos eliminados exitosamente',
      page: page
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({ 
      message: 'Error al eliminar página', 
      error: error.message 
    });
  }
});

// AddModules - Agregar módulos a una página existente
router.post('/addModules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleTypes } = req.body;

    // Buscar la página
    const page = await Page.findById(id);
    
    if (!page) {
      return res.status(404).json({ 
        message: 'Página no encontrada' 
      });
    }

    if (!moduleTypes || !Array.isArray(moduleTypes) || moduleTypes.length === 0) {
      return res.status(400).json({ 
        message: 'Debe proporcionar un array de tipos de módulos' 
      });
    }

    const validTypes = ['read', 'create', 'delete', 'update'];
    const moduleIds = [];

    // Crear los nuevos módulos
    for (const type of moduleTypes) {
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          message: `Tipo de módulo inválido: ${type}. Debe ser: read, create, delete o update` 
        });
      }

      // Verificar si ya existe un módulo de ese tipo para esta página
      const existingModule = await Module.findOne({ 
        pageId: page._id, 
        type: type 
      });

      if (existingModule) {
        return res.status(400).json({ 
          message: `Ya existe un módulo de tipo '${type}' para esta página` 
        });
      }

      const newModule = new Module({
        pageId: page._id,
        type: type
      });

      await newModule.save();
      moduleIds.push(newModule._id);
    }

    // Agregar los nuevos módulos al array de la página
    page.modules = [...page.modules, ...moduleIds];
    await page.save();

    // Obtener módulos actualizados
    const modules = await Module.find({ _id: { $in: page.modules } });

    res.status(201).json({
      message: 'Módulos agregados exitosamente',
      page: {
        ...page.toObject(),
        moduleDetails: modules
      }
    });

  } catch (error) {
    console.error('Error en addModules:', error);
    res.status(500).json({ 
      message: 'Error al agregar módulos', 
      error: error.message 
    });
  }
});

// RemoveModule - Eliminar un módulo específico de una página
router.delete('/removeModule/:pageId/:moduleId', async (req, res) => {
  try {
    const { pageId, moduleId } = req.params;

    // Buscar la página
    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.status(404).json({ 
        message: 'Página no encontrada' 
      });
    }

    // Verificar si el módulo existe
    const module = await Module.findById(moduleId);
    
    if (!module) {
      return res.status(404).json({ 
        message: 'Módulo no encontrado' 
      });
    }

    // Verificar que el módulo pertenezca a la página
    if (module.pageId !== pageId) {
      return res.status(400).json({ 
        message: 'El módulo no pertenece a esta página' 
      });
    }

    // Eliminar el módulo del array de la página
    page.modules = page.modules.filter(id => id !== moduleId);
    await page.save();

    // Eliminar el módulo
    await Module.findByIdAndDelete(moduleId);

    // Obtener módulos restantes
    const modules = await Module.find({ _id: { $in: page.modules } });

    res.status(200).json({
      message: 'Módulo eliminado exitosamente',
      page: {
        ...page.toObject(),
        moduleDetails: modules
      }
    });

  } catch (error) {
    console.error('Error en removeModule:', error);
    res.status(500).json({ 
      message: 'Error al eliminar módulo', 
      error: error.message 
    });
  }
});

export const routeConfig = { path: "/v1/pages", router }