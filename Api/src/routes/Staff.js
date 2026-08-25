import Staff from "../models/Staff.js";
import RoleAssignment from "../models/RoleAssignment.js";
import Role from "../models/Role.js";
import Store from "../models/Store.js";
import Brand from "../models/Brand.js";
import Module from "../models/Module.js";

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

// Register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, profile, roleId, brandId, scope } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validar que los campos requeridos estén presentes
    if (!username || !password || !profile?.names || !profile?.lastNames) {
      return res.status(400).json({
        message: 'Username, password, nombres y apellidos son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const duplicateFilters = [{ username }];
    if (normalizedEmail) {
      duplicateFilters.push({ email: normalizedEmail });
    }

    const existingUser = await Staff.findOne({ $or: duplicateFilters });

    if (existingUser) {
      return res.status(400).json({
        message: 'El usuario o email ya existe'
      });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    const newUser = new Staff({
      username,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      password: hashedPassword,
      profile: {
        names: profile.names,
        lastNames: profile.lastNames,
        phone: profile.phone || ''
      }
    });

    await newUser.save();

    // Si se proporciona un roleId y brandId, asignar el rol
    if (roleId && brandId) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(400).json({
          message: 'El rol especificado no existe'
        });
      }

      // Validar que el rol pertenezca a la marca
      if (role.brandId !== brandId) {
        return res.status(400).json({
          message: 'El rol no pertenece a la marca especificada'
        });
      }

      // Validar scope
      const roleScope = scope || { type: 'brand' };
      
      if (roleScope.type === 'store') {
        if (!roleScope.targetId) {
          return res.status(400).json({
            message: 'Debe especificar el ID de la tienda para scope de tipo store'
          });
        }

        // Verificar que la tienda exista y pertenezca a la marca
        const store = await Store.findById(roleScope.targetId);
        if (!store || store.brandId !== brandId) {
          return res.status(400).json({
            message: 'La tienda no existe o no pertenece a la marca'
          });
        }
      }

      const roleAssignment = new RoleAssignment({
        userId: newUser._id,
        roleId: roleId,
        brandId: brandId,
        scope: roleScope
      });
      await roleAssignment.save();
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: newUser._id
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
});

// GetById - Obtener información de un usuario
router.get('/getById/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await Staff.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const assignments = await RoleAssignment.find({ userId }).populate('roleId');

    const userWithDetails = {
      ...user.toObject(),
      assignments: assignments.map((assignment) => ({
        roleId: assignment.roleId?._id,
        roleName: assignment.roleId?.name,
        scope: assignment.scope,
      })),
    };

    return res.status(200).json({
      message: 'Usuario obtenido exitosamente',
      user: userWithDetails,
    });
  } catch (error) {
    console.error('Error en getById:', error);
    return res.status(500).json({
      message: 'Error al obtener usuario',
      error: error.message,
    });
  }
});

// Patch - Actualizar perfil básico del usuario
router.patch('/updateProfile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, profile } = req.body;

    const user = await Staff.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const nextUsername = typeof username === 'string' ? username.trim() : user.username;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!nextUsername) {
      return res.status(400).json({ message: 'El username es requerido' });
    }

    const duplicateFilters = [{ username: nextUsername }];
    if (normalizedEmail) {
      duplicateFilters.push({ email: normalizedEmail });
    }

    const duplicated = await Staff.findOne({
      _id: { $ne: userId },
      $or: duplicateFilters,
    });

    if (duplicated) {
      return res.status(400).json({ message: 'El username o email ya está en uso' });
    }

    user.username = nextUsername;
    if (typeof email === 'string') {
      user.email = normalizedEmail || undefined;
    }

    if (profile?.names !== undefined) {
      user.profile.names = profile.names;
    }

    if (profile?.lastNames !== undefined) {
      user.profile.lastNames = profile.lastNames;
    }

    if (profile?.phone !== undefined) {
      user.profile.phone = profile.phone;
    }

    await user.save();

    return res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({
      message: 'Error al actualizar perfil',
      error: error.message,
    });
  }
});

// Patch - Actualizar status de usuario
router.patch('/updateStatus/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (typeof status !== 'boolean') {
      return res.status(400).json({ message: 'El status es requerido y debe ser booleano' });
    }

    const user = await Staff.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      message: 'Estado actualizado exitosamente',
      user: {
        _id: user._id,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error en updateStatus:', error);
    return res.status(500).json({
      message: 'Error al actualizar estado del usuario',
      error: error.message,
    });
  }
});

// Login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar campos
    if (!username || !password) {
      return res.status(400).json({
        message: 'Usuario y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const user = await Staff.findOne({ username });

    if (!user) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el usuario está activo
    if (!user.status) {
      return res.status(403).json({
        message: 'Usuario inactivo'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    // 2. Buscar todas sus asignaciones de roles y traer datos de Roles y Tiendas
    const assignments = await RoleAssignment.find({ userId: user._id }).populate('roleId');
    // 3. Procesar el "Scope"
    // Determinamos si es nivel Marca (Dueño) o nivel Tienda (Cajero/Gerente)
    const isBrandAdmin = assignments.some(a => a.scope.type === 'brand');
    const brandId = assignments[0]?.brandId;

    let accessibleStores = [];

    if (isBrandAdmin) {
      // Si es admin de marca, buscamos TODAS las tiendas de esa marca
      accessibleStores = await Store.find({ brandId });
    } else {
      // Si es de tienda, extraemos los IDs de las tiendas asignadas
      const storeIds = assignments.map(a => a.scope.targetId);
      accessibleStores = await Store.find({ _id: { $in: storeIds } });
    }


    // 4. Consolidar permisos únicos de todos sus roles
    const allPermissions = [...new Set(assignments.flatMap(a => a.roleId.permissions))];

    let modules = await Module.find()
      .populate('pageId', 'name')
      .lean();

    modules = modules.map(m => (
      {
        _id: m._id,
        page: m.pageId.name,
        type: m.type,
      }));

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        profile: user.profile,
      },
      process.env.jwtSecret,
      { expiresIn: '120d' }
    );

    res.status(200).json({
      message: 'Login exitoso',
      token,
      modules,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
      },
      access: {
        brandId: brandId,
        level: isBrandAdmin ? 'brand' : 'store',
        permissions: allPermissions,
        stores: accessibleStores.map(s => ({ id: s._id, name: s.name }))
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
});

// GetAll - Obtener todos los usuarios
router.get('/getAll', async (req, res) => {
  try {
    const users = await Staff.find().select('-password');

    // Obtener roles para cada usuario
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roleAssignments = await RoleAssignment.find({ userId: user._id });
        const roleIds = roleAssignments.map(ra => ra.roleId);
        const roles = await Role.find({ _id: { $in: roleIds } });

        return {
          ...user.toObject(),
          role: roles.map(r => ({ id: r._id, name: r.name }))[0]?.name || 'Sin rol'
        };
      })
    );

    res.status(200).json({
      message: 'Usuarios obtenidos exitosamente',
      count: usersWithRoles.length,
      users: usersWithRoles
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

// GetByBrand - Obtener todo el staff de una marca
router.get('/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;

    // Buscar todas las asignaciones de roles para esta marca
    const roleAssignments = await RoleAssignment.find({ brandId }).populate('roleId');

    // Obtener IDs únicos de usuarios
    const userIds = [...new Set(roleAssignments.map(ra => ra.userId))];

    // Buscar usuarios
    const users = await Staff.find({ _id: { $in: userIds } }).select('-password');

    // Enriquecer con información de roles y scope
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const userAssignments = roleAssignments.filter(ra => ra.userId === user._id);
        
        return {
          ...user.toObject(),
          assignments: userAssignments.map(ra => ({
            roleId: ra.roleId._id,
            roleName: ra.roleId.name,
            scope: ra.scope,
            scopeLevel: ra.scope.type === 'brand' ? 'Toda la marca' : 'Tienda específica'
          }))
        };
      })
    );

    res.status(200).json({
      message: 'Staff de la marca obtenido exitosamente',
      brandId: brandId,
      count: usersWithDetails.length,
      users: usersWithDetails
    });

  } catch (error) {
    console.error('Error en getByBrand:', error);
    res.status(500).json({
      message: 'Error al obtener staff de la marca',
      error: error.message
    });
  }
});

// GetByStore - Obtener staff de una tienda específica
router.get('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    // Buscar la tienda para obtener su brandId
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    // Buscar asignaciones de roles que tengan:
    // 1. Scope de tipo 'brand' con el brandId de esta tienda (acceso a todas las tiendas)
    // 2. Scope de tipo 'store' con targetId igual a esta tienda
    const roleAssignments = await RoleAssignment.find({
      brandId: store.brandId,
      $or: [
        { 'scope.type': 'brand' },
        { 'scope.type': 'store', 'scope.targetId': storeId }
      ]
    }).populate('roleId');

    // Obtener IDs únicos de usuarios
    const userIds = [...new Set(roleAssignments.map(ra => ra.userId))];

    // Buscar usuarios
    const users = await Staff.find({ _id: { $in: userIds } }).select('-password');

    // Enriquecer con información de roles y scope
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const userAssignments = roleAssignments.filter(ra => ra.userId === user._id);
        
        return {
          ...user.toObject(),
          assignments: userAssignments.map(ra => ({
            roleId: ra.roleId._id,
            roleName: ra.roleId.name,
            scope: ra.scope,
            accessLevel: ra.scope.type === 'brand' ? 'Admin de marca' : 'Personal de tienda'
          }))
        };
      })
    );

    res.status(200).json({
      message: 'Staff de la tienda obtenido exitosamente',
      storeId: storeId,
      storeName: store.name,
      brandId: store.brandId,
      count: usersWithDetails.length,
      users: usersWithDetails
    });

  } catch (error) {
    console.error('Error en getByStore:', error);
    res.status(500).json({
      message: 'Error al obtener staff de la tienda',
      error: error.message
    });
  }
});


router.post('/changePassword', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Validar campos
    if (!userId || !newPassword) {
      return res.status(400).json({
        message: 'Todos los campos son requeridos'
      });
    }

    // Validar longitud de la nueva contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Buscar usuario
    const user = await Staff.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Hashear la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
});

export const routeConfig = { path: "/v1/staff", router }