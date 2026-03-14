// Data store for users, roles, permissions

// Simple UUID generator
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Simple hash (for demo - in production use bcrypt on server)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface Role {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  name: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  username: string;
  password_hash: string;
  role_id: string;
  estActif: boolean;
  dateCreation: Date;
  dateConnection: Date;
  DerniereConnectionIP: string;
}

const STORAGE_KEYS = {
  users: 'app_users',
  roles: 'app_roles',
  permissions: 'app_permissions',
  rolePermissions: 'app_role_permissions',
  initialized: 'app_initialized',
};

function load<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export async function initializeStore() {
  if (localStorage.getItem(STORAGE_KEYS.initialized)) return;

  const adminRole: Role = { id: generateId(), name: 'Admin' };
  const userRole: Role = { id: generateId(), name: 'User' };
  save(STORAGE_KEYS.roles, [adminRole, userRole]);

  const viewPerm: Permission = { id: generateId(), name: 'view_dashboard' };
  const managePerm: Permission = { id: generateId(), name: 'manage_users' };
  const manageRoles: Permission = { id: generateId(), name: 'manage_roles' };
  save(STORAGE_KEYS.permissions, [viewPerm, managePerm, manageRoles]);

  const rolePerms: RolePermission[] = [
    { role_id: adminRole.id, permission_id: viewPerm.id },
    { role_id: adminRole.id, permission_id: managePerm.id },
    { role_id: adminRole.id, permission_id: manageRoles.id },
    { role_id: userRole.id, permission_id: viewPerm.id },
  ];
  save(STORAGE_KEYS.rolePermissions, rolePerms);

  const adminHash = await hashPassword('admin');
  const admin: User = { id: generateId(), username: 'admin', password_hash: adminHash, role_id: adminRole.id, email: 'admin@example.com', nom: 'Admin', prenom: 'Admin', estActif: true, dateCreation: new Date(), dateConnection: new Date(), DerniereConnectionIP: '' };
  save(STORAGE_KEYS.users, [admin]);

  localStorage.setItem(STORAGE_KEYS.initialized, 'true');
}

// Auth
export async function authenticate(username: string, password: string): Promise<User | null> {
  const users = load<User>(STORAGE_KEYS.users);
  const hash = await hashPassword(password);
  return users.find(u => u.username === username && u.password_hash === hash) || null;
}

export function isAdmin(user: User): boolean {
  const roles = load<Role>(STORAGE_KEYS.roles);
  const role = roles.find(r => r.id === user.role_id);
  return role?.name === 'Admin';
}

// Users CRUD
export function getUsers(): User[] { return load<User>(STORAGE_KEYS.users); }

export async function createUser(username: string, password: string, role_id: string): Promise<User> {
  const users = load<User>(STORAGE_KEYS.users);
  if (users.find(u => u.username === username)) throw new Error('Username already exists');
  const hash = await hashPassword(password);
  const user: User = { id: generateId(), username, password_hash: hash, role_id, email: '', nom: '', prenom: '', estActif: true, dateCreation: new Date(), dateConnection: new Date(), DerniereConnectionIP: '' };
  users.push(user);
  save(STORAGE_KEYS.users, users);
  return user;
}

export async function updateUser(id: string, data: { username?: string; password?: string; role_id?: string }) {
  const users = load<User>(STORAGE_KEYS.users);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  if (data.username) {
    if (users.find(u => u.username === data.username && u.id !== id)) throw new Error('Username already exists');
    users[idx].username = data.username;
  }
  if (data.password) users[idx].password_hash = await hashPassword(data.password);
  if (data.role_id) users[idx].role_id = data.role_id;
  save(STORAGE_KEYS.users, users);
  return users[idx];
}

export function deleteUser(id: string) {
  const users = load<User>(STORAGE_KEYS.users).filter(u => u.id !== id);
  save(STORAGE_KEYS.users, users);
}

// Roles CRUD
export function getRoles(): Role[] { return load<Role>(STORAGE_KEYS.roles); }

export function createRole(name: string): Role {
  const roles = load<Role>(STORAGE_KEYS.roles);
  if (roles.find(r => r.name === name)) throw new Error('Role already exists');
  const role: Role = { id: generateId(), name };
  roles.push(role);
  save(STORAGE_KEYS.roles, roles);
  return role;
}

export function updateRole(id: string, name: string) {
  const roles = load<Role>(STORAGE_KEYS.roles);
  const idx = roles.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Role not found');
  if (roles.find(r => r.name === name && r.id !== id)) throw new Error('Role name already exists');
  roles[idx].name = name;
  save(STORAGE_KEYS.roles, roles);
  return roles[idx];
}

export function deleteRole(id: string) {
  const users = load<User>(STORAGE_KEYS.users);
  if (users.some(u => u.role_id === id)) throw new Error('Cannot delete role assigned to users');
  save(STORAGE_KEYS.roles, load<Role>(STORAGE_KEYS.roles).filter(r => r.id !== id));
  save(STORAGE_KEYS.rolePermissions, load<RolePermission>(STORAGE_KEYS.rolePermissions).filter(rp => rp.role_id !== id));
}

// Permissions CRUD
export function getPermissions(): Permission[] { return load<Permission>(STORAGE_KEYS.permissions); }

export function createPermission(name: string): Permission {
  const perms = load<Permission>(STORAGE_KEYS.permissions);
  if (perms.find(p => p.name === name)) throw new Error('Permission already exists');
  const perm: Permission = { id: generateId(), name };
  perms.push(perm);
  save(STORAGE_KEYS.permissions, perms);
  return perm;
}

export function updatePermission(id: string, name: string) {
  const perms = load<Permission>(STORAGE_KEYS.permissions);
  const idx = perms.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Permission not found');
  if (perms.find(p => p.name === name && p.id !== id)) throw new Error('Permission name already exists');
  perms[idx].name = name;
  save(STORAGE_KEYS.permissions, perms);
  return perms[idx];
}

export function deletePermission(id: string) {
  save(STORAGE_KEYS.permissions, load<Permission>(STORAGE_KEYS.permissions).filter(p => p.id !== id));
  save(STORAGE_KEYS.rolePermissions, load<RolePermission>(STORAGE_KEYS.rolePermissions).filter(rp => rp.permission_id !== id));
}

// Role-Permission
export function getRolePermissions(): RolePermission[] { return load<RolePermission>(STORAGE_KEYS.rolePermissions); }

export function setRolePermissions(role_id: string, permission_ids: string[]) {
  const all = load<RolePermission>(STORAGE_KEYS.rolePermissions).filter(rp => rp.role_id !== role_id);
  permission_ids.forEach(pid => all.push({ role_id, permission_id: pid }));
  save(STORAGE_KEYS.rolePermissions, all);
}