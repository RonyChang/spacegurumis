import React from 'react';
import AdminGuard from '../../admin/AdminGuard';
import AdminShell from '../../admin/AdminShell';

const MODULES = [
    {
        href: '/admin/usuarios-admin',
        title: 'Usuarios admin',
        description: 'Crear, promover o remover cuentas con rol administrador.',
    },
    {
        href: '/admin/catalogo',
        title: 'Catalogo',
        description: 'CRUD de categorias, productos y variantes con borrado por alcance.',
    },
    {
        href: '/admin/imagenes',
        title: 'Imagenes',
        description: 'Gestion por scope: categoria, producto o galeria de variante.',
    },
    {
        href: '/admin/descuentos',
        title: 'Descuentos',
        description: 'Crear, editar, activar y eliminar codigos de descuento.',
    },
];

export default function AdminHubPage() {
    return (
        <AdminGuard>
            <AdminShell
                title="Panel de administracion"
                description="Selecciona un modulo para gestionar usuarios, catalogo, imagenes y descuentos."
            >
                <div className="grid grid--cards admin-hub__grid">
                    {MODULES.map((module) => (
                        <article key={module.href} className="card admin-hub__card">
                            <h2 className="card__title">{module.title}</h2>
                            <p className="card__meta">{module.description}</p>
                            <a className="button button--primary" href={module.href}>
                                Abrir modulo
                            </a>
                        </article>
                    ))}
                </div>
            </AdminShell>
        </AdminGuard>
    );
}
