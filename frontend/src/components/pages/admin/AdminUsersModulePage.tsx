import React, { useEffect, useState } from 'react';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import TextField from '../../ui/TextField';
import AdminGuard from '../../admin/AdminGuard';
import AdminShell from '../../admin/AdminShell';
import {
    createAdminUser,
    listAdminUsers,
    removeAdminUser,
    type AdminUser,
    type CreateAdminUserPayload,
} from '../../../lib/api/admin';

export default function AdminUsersModulePage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
    const [form, setForm] = useState<CreateAdminUserPayload & { password: string }>({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });

    async function loadUsers() {
        setLoading(true);
        try {
            const res = await listAdminUsers();
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo cargar usuarios admin.',
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        try {
            const res = await createAdminUser({
                email: form.email.trim(),
                password: form.password.trim() || undefined,
                firstName: form.firstName?.trim() || undefined,
                lastName: form.lastName?.trim() || undefined,
            });
            const action = res.data && res.data.action ? res.data.action : 'created';
            setNotice({
                tone: 'success',
                message: action === 'promoted' ? 'Usuario promovido a admin.' : 'Admin creado correctamente.',
            });
            setForm({ email: '', password: '', firstName: '', lastName: '' });
            await loadUsers();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo crear/promover admin.',
            });
        }
    }

    async function handleRemove(user: AdminUser) {
        if (typeof window !== 'undefined') {
            const ok = window.confirm(`Vas a remover permisos admin de ${user.email}.`);
            if (!ok) {
                return;
            }
        }

        try {
            await removeAdminUser(user.id);
            setNotice({ tone: 'success', message: `Permisos admin removidos para ${user.email}.` });
            await loadUsers();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo remover admin.',
            });
        }
    }

    return (
        <AdminGuard>
            <AdminShell
                title="Usuarios admin"
                description="Gestiona altas/promociones y remocion de permisos admin con confirmacion explicita."
            >
                {notice ? <Alert tone={notice.tone}>{notice.message}</Alert> : null}
                {loading ? <p className="status">Actualizando usuarios...</p> : null}

                <div className="admin-module-grid">
                    <section className="card">
                        <h2 className="card__title">Admins actuales</h2>
                        <p className="card__meta">Total: {users.length}</p>
                        <div className="admin-list">
                            {users.map((user) => (
                                <div className="admin-list__row" key={user.id}>
                                    <strong>{user.email}</strong>
                                    <span className="muted">
                                        {(user.firstName || '').trim()} {(user.lastName || '').trim()}
                                    </span>
                                    <div className="form__actions">
                                        <Button
                                            type="button"
                                            variant="danger"
                                            onClick={() => handleRemove(user)}
                                            aria-label={`Remover admin ${user.email}`}
                                        >
                                            Remover admin
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {!users.length ? <p className="status">No hay usuarios admin disponibles.</p> : null}
                        </div>
                    </section>

                    <section className="card">
                        <h2 className="card__title">Agregar o promover admin</h2>
                        <form className="form" onSubmit={handleCreate}>
                            <TextField
                                label="Email"
                                type="email"
                                value={form.email}
                                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Password (solo si es usuario nuevo)"
                                type="password"
                                value={form.password}
                                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            />
                            <div className="form__grid">
                                <TextField
                                    label="Nombre"
                                    value={form.firstName || ''}
                                    onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                                />
                                <TextField
                                    label="Apellido"
                                    value={form.lastName || ''}
                                    onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                                />
                            </div>
                            <div className="form__actions">
                                <Button type="submit">Crear / promover admin</Button>
                            </div>
                        </form>
                    </section>
                </div>
            </AdminShell>
        </AdminGuard>
    );
}
