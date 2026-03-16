import bcrypt from "bcrypt";

import Brand from "../models/Brand.js";
import Module from "../models/Module.js";
import Role from "../models/Role.js";
import RoleAssignment from "../models/RoleAssignment.js";
import Staff from "../models/Staff.js";
import Store from "../models/Store.js";

const buildError = (message, statusCode = 400) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
};

const validatePayload = (payload) => {
	const { brand, initialStore, superAdmin } = payload || {};

	if (!brand?.name) {
		throw buildError("El nombre de la marca es requerido");
	}

	if (!initialStore?.name) {
		throw buildError("El nombre de la tienda inicial es requerido");
	}

	if (!superAdmin?.username || !superAdmin?.email || !superAdmin?.password) {
		throw buildError("username, email y password del super admin son requeridos");
	}

	if (!superAdmin?.profile?.names || !superAdmin?.profile?.lastNames) {
		throw buildError("Los nombres y apellidos del super admin son requeridos");
	}
};

export const createFullBrandSetup = async (payload) => {
	validatePayload(payload);

	const { brand, initialStore, superAdmin } = payload;

	const existingUser = await Staff.findOne({
		$or: [
			{ username: superAdmin.username },
			{ email: superAdmin.email.toLowerCase() }
		]
	});

	if (existingUser) {
		throw buildError("El username o email del super admin ya existe", 409);
	}

	const modules = await Module.find().select("_id");
	if (!modules.length) {
		throw buildError("No existen módulos configurados para asignar permisos", 400);
	}

	const moduleIds = modules.map((module) => module._id);

	const created = {
		brand: null,
		store: null,
		role: null,
		user: null,
		assignment: null
	};

	try {
		created.brand = await Brand.create({
			name: brand.name,
			description: brand.description,
			logo: brand.logo,
			website: brand.website,
			email: brand.email,
			phone: brand.phone,
			address: brand.address,
			isActive: brand.isActive
		});

		created.store = await Store.create({
			brandId: created.brand._id,
			name: initialStore.name,
			code: initialStore.code,
			description: initialStore.description,
			email: initialStore.email,
			phone: initialStore.phone,
			address: initialStore.address,
			isActive: initialStore.isActive
		});

		created.role = await Role.create({
			name: "Super Admin",
			brandId: created.brand._id,
			permissions: moduleIds
		});

		const hashedPassword = await bcrypt.hash(superAdmin.password, 10);

		created.user = await Staff.create({
			username: superAdmin.username,
			email: superAdmin.email.toLowerCase(),
			password: hashedPassword,
			profile: {
				names: superAdmin.profile.names,
				lastNames: superAdmin.profile.lastNames,
				phone: superAdmin.profile.phone || ""
			},
			status: superAdmin.status
		});

		created.assignment = await RoleAssignment.create({
			userId: created.user._id,
			roleId: created.role._id,
			brandId: created.brand._id,
			scope: { type: "brand" }
		});

		return {
			brand: created.brand,
			store: created.store,
			role: created.role,
			superAdmin: {
				_id: created.user._id,
				username: created.user.username,
				email: created.user.email,
				profile: created.user.profile,
				status: created.user.status
			},
			roleAssignment: created.assignment
		};
	} catch (error) {
		if (created.assignment?._id) {
			await RoleAssignment.deleteOne({ _id: created.assignment._id });
		}
		if (created.user?._id) {
			await Staff.deleteOne({ _id: created.user._id });
		}
		if (created.role?._id) {
			await Role.deleteOne({ _id: created.role._id });
		}
		if (created.store?._id) {
			await Store.deleteOne({ _id: created.store._id });
		}
		if (created.brand?._id) {
			await Brand.deleteOne({ _id: created.brand._id });
		}

		if (error.code === 11000) {
			throw buildError("Conflicto de datos únicos (username, email o código de tienda)", 409);
		}

		throw error;
	}
};

