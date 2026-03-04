import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import Client from "../models/Client.js"
import Store from "../models/Store.js"
import Visit from "../models/Visit.js"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"


const router = express.Router()

// Create - Crear nuevo cliente
router.post('/create', async (req, res) => {
  try {
    const { email, storeId, profile } = req.body;

    // Validar campos requeridos
    if (!email || !storeId || !profile?.names || !profile?.lastNames) {
      return res.status(400).json({
        message: 'Email, ID de tienda, nombres y apellidos son requeridos'
      });
    }

    // Buscar la tienda para obtener el brandId
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    // Verificar si el cliente ya existe
    const existingClient = await Client.findOne({ email });

    if (existingClient) {
      return res.status(400).json({
        message: 'El email ya está registrado'
      });
    }

    // Extraer username del email (texto antes del @)
    const username = email.split('@')[0];

    // Verificar si el username ya existe
    const existingUsername = await Client.findOne({ username });

    if (existingUsername) {
      return res.status(400).json({
        message: 'El username derivado del email ya existe. Use un email diferente.'
      });
    }

    // Generar contraseña hasheada usando el username
    const hashedPassword = await bcrypt.hash(username, 10);

    // Crear el nuevo cliente
    const newClient = new Client({
      brandId: store.brandId,
      storeId,
      username,
      email,
      password: hashedPassword,
      profile: {
        names: profile.names,
        lastNames: profile.lastNames,
        phone: profile.phone || ''
      }
    });

    await newClient.save();

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      client: {
        id: newClient._id,
        username: newClient.username,
        email: newClient.email,
        profile: newClient.profile
      },
      credentials: {
        username: username,
        defaultPassword: username,
        message: 'El cliente debe cambiar su contraseña en el primer login'
      }
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({
      message: 'Error al crear cliente',
      error: error.message
    });
  }
});

// ===================== Endpoints de inicio de sesión de cliente =====================
// Login - Iniciar sesión de cliente
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar campos
    if (!username || !password) {
      return res.status(400).json({
        message: 'Username/email y contraseña son requeridos'
      });
    }

    // Buscar cliente por username o email
    const client = await Client.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!client) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el cliente está activo
    if (!client.status) {
      return res.status(403).json({
        message: 'Cliente inactivo'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, client.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    const token = jwt.sign(
      {
        userId: client._id,
        username: client.username,
        email: client.email,
      },
      process.env.jwtSecret || 'client-login-dev-secret',
      { expiresIn: '120d' }
    );

    res.status(200).json({
      message: 'Login exitoso',
      token,
      client: {
        id: client._id,
        username: client.username,
        email: client.email,
        profile: client.profile,
        brandId: client.brandId,
        storeId: client.storeId
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

// ===================== Endpoints de gestión de clientes =====================

// GetAll - Obtener todos los clientes
router.get('/getAll', async (req, res) => {
  try {
    const clients = await Client.find().select('-password');

    res.status(200).json({
      message: 'Clientes obtenidos exitosamente',
      count: clients.length,
      clients: clients
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
});

// GetByBrand - Obtener clientes de una marca
router.get('/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;

    const clients = await Client.find({ brandId }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Clientes de la marca obtenidos exitosamente',
      brandId: brandId,
      count: clients.length,
      clients: clients
    });

  } catch (error) {
    console.error('Error en getByBrand:', error);
    res.status(500).json({
      message: 'Error al obtener clientes de la marca',
      error: error.message
    });
  }
});

// GetByStore - Obtener clientes de una tienda
router.get('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    // Buscar la tienda
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    // Obtener clientes registrados en esta tienda
    const clients = await Client.find({ storeId }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Clientes de la tienda obtenidos exitosamente',
      storeId: storeId,
      storeName: store.name,
      brandId: store.brandId,
      count: clients.length,
      clients: clients
    });

  } catch (error) {
    console.error('Error en getByStore:', error);
    res.status(500).json({
      message: 'Error al obtener clientes de la tienda',
      error: error.message
    });
  }
});

// GetById - Obtener un cliente por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id).select('-password');

    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    res.status(200).json({
      message: 'Cliente obtenido exitosamente',
      client: client
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({
      message: 'Error al obtener cliente',
      error: error.message
    });
  }
});

// Update - Actualizar un cliente
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, profile, status } = req.body;

    // Buscar el cliente
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    // Actualizar email y username si se cambia el email
    if (email && email !== client.email) {
      // Verificar que el nuevo email no exista
      const existingEmail = await Client.findOne({ email, _id: { $ne: id } });

      if (existingEmail) {
        return res.status(400).json({
          message: 'El email ya está en uso'
        });
      }

      const newUsername = email.split('@')[0];

      // Verificar que el nuevo username no exista
      const existingUsername = await Client.findOne({ username: newUsername, _id: { $ne: id } });

      if (existingUsername) {
        return res.status(400).json({
          message: 'El username derivado del email ya existe'
        });
      }

      client.email = email;
      client.username = newUsername;
    }

    // Actualizar perfil
    if (profile) {
      if (profile.names) client.profile.names = profile.names;
      if (profile.lastNames) client.profile.lastNames = profile.lastNames;
      if (profile.phone !== undefined) client.profile.phone = profile.phone;
    }

    // Actualizar estado
    if (status !== undefined) client.status = status;

    await client.save();

    res.status(200).json({
      message: 'Cliente actualizado exitosamente',
      client: {
        id: client._id,
        username: client.username,
        email: client.email,
        profile: client.profile,
        status: client.status
      }
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({
      message: 'Error al actualizar cliente',
      error: error.message
    });
  }
});

// Delete - Eliminar un cliente
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByIdAndDelete(id);

    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    res.status(200).json({
      message: 'Cliente eliminado exitosamente',
      client: {
        id: client._id,
        username: client.username,
        email: client.email
      }
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({
      message: 'Error al eliminar cliente',
      error: error.message
    });
  }
});

// ChangePassword - Cambiar contraseña
router.post('/changePassword', async (req, res) => {
  try {
    const { clientId, currentPassword, newPassword } = req.body;

    // Validar campos
    if (!clientId || !currentPassword || !newPassword) {
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

    // Buscar cliente
    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si el cliente está activo
    if (!client.status) {
      return res.status(403).json({
        message: 'Cliente inactivo'
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, client.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Contraseña actual incorrecta'
      });
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, client.password);

    if (isSamePassword) {
      return res.status(400).json({
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Hashear la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    client.password = hashedNewPassword;
    await client.save();

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

router.get('/assistance/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const visits = await Visit.find({ clientId })

    res.status(200).json({
      message: 'Asistencias del cliente obtenidas exitosamente.',
      clientId,
      count: visits.length,
      visits
    });
  }
  catch (error) {
    console.error('Error en getAssistance:', error);
    res.status(500).json({
      message: 'Error al obtener asistencias del cliente',
      error: error.message
    })
  }

})

router.post('/login-qr', async (req, res) => {
  try {
    const { qrData } = req.body;

    const data = jwt.decode(qrData,
      process.env.jwtSecret || 'client-login-dev-secret',)

    const client = await Client.findById(data.userId)

    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    const sub = await SubscriptionAssignment.findOne({ clientId: client._id, status: 'active' })
    if (!sub) {
      return res.status(403).json({
        message: 'El cliente no tiene una suscripción activa'
      });
    }


    console.log(data)

    Visit.create({
      brandId: client.brandId,
      storeId: client.storeId,
      clientId: client._id,
      accessMethod: 'qr',
      isTrial: sub.isTrial
    });

    res.status(200).json({
      message: 'QR decodificado exitosamente',
      success: true,
    })

  } catch (error) {
    console.error('Error en login-qr:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión con QR',
      error: error.message
    });
  }
})

export const routeConfig = { path: "/v1/clients", router }