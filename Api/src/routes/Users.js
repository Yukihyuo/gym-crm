import User from "../models/User.js";
import RoleAssignment from "../models/RoleAssignment.js";
import Role from "../models/Role.js";

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

// Register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, profile, roleId } = req.body;

    // Validar que los campos requeridos estén presentes
    if (!username || !email || !password || !profile?.names || !profile?.lastNames) {
      return res.status(400).json({
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'El usuario o email ya existe'
      });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      profile: {
        names: profile.names,
        lastNames: profile.lastNames,
        phone: profile.phone || ''
      }
    });

    await newUser.save();

    // Si se proporciona un roleId, asignar el rol
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(400).json({
          message: 'El rol especificado no existe'
        });
      }

      const roleAssignment = new RoleAssignment({
        userId: newUser._id,
        roleId: roleId
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
    const user = await User.findOne({ username });

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

    // Obtener roles del usuario
    const roleAssignments = await RoleAssignment.find({ userId: user._id });
    const roleIds = roleAssignments.map(ra => ra.roleId);
    const roles = await Role.find({ _id: { $in: roleIds } });

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        roles: roles.map(r => r.name)
      },
      process.env.jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        roles: roles.map(r => ({ id: r._id, name: r.name }))
      }
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
    const users = await User.find().select('-password');

    // Obtener roles para cada usuario
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roleAssignments = await RoleAssignment.find({ userId: user._id });
        const roleIds = roleAssignments.map(ra => ra.roleId);
        const roles = await Role.find({ _id: { $in: roleIds } });

        return {
          ...user.toObject(),
          roles: roles.map(r => ({ id: r._id, name: r.name }))
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

// GetByRole - Obtener usuarios por nombre de rol
router.get('/getByRole/:roleName', async (req, res) => {
  try {
    const { roleName } = req.params;

    // Buscar el rol por nombre
    const role = await Role.findOne({ name: roleName });

    if (!role) {
      return res.status(404).json({
        message: `Rol '${roleName}' no encontrado`
      });
    }

    // Buscar asignaciones de rol
    const roleAssignments = await RoleAssignment.find({ roleId: role._id });
    const userIds = roleAssignments.map(ra => ra.userId);

    // Buscar usuarios con ese rol
    const users = await User.find({
      _id: { $in: userIds }
    }).select('-password');

    res.status(200).json({
      message: `Usuarios con rol '${roleName}' obtenidos exitosamente`,
      role: { id: role._id, name: role.name },
      count: users.length,
      users: users
    });

  } catch (error) {
    console.error('Error en getByRole:', error);
    res.status(500).json({
      message: 'Error al obtener usuarios por rol',
      error: error.message
    });
  }
});

// ChangePassword - Cambiar contraseña
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
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario está activo
    if (!user.status) {
      return res.status(403).json({
        message: 'Usuario inactivo'
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

export default router;