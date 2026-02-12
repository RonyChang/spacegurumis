import React, { useEffect, useState } from 'react';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import TextField from '../../ui/TextField';
import AdminGuard from '../../admin/AdminGuard';
import AdminShell from '../../admin/AdminShell';
import {
    createAdminDiscount,
    deleteAdminDiscount,
    listAdminDiscounts,
    updateAdminDiscount,
    type AdminDiscount,
} from '../../../lib/api/admin';

type NoticeTone = 'info' | 'success' | 'error';

type DiscountForm = {
    code: string;
    percentage: string;
    isActive: boolean;
    startsAt: string;
    expiresAt: string;
    maxUses: string;
    minSubtotal: string;
};

function draftFromDiscount(discount: AdminDiscount): DiscountForm {
    return {
        code: discount.code,
        percentage: String(discount.percentage),
        isActive: Boolean(discount.isActive),
        startsAt: discount.startsAt || '',
        expiresAt: discount.expiresAt || '',
        maxUses: discount.maxUses === null || discount.maxUses === undefined ? '' : String(discount.maxUses),
        minSubtotal:
            discount.minSubtotal === null || discount.minSubtotal === undefined ? '' : String(discount.minSubtotal),
    };
}

export default function AdminDiscountsModulePage() {
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
    const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
    const [drafts, setDrafts] = useState<Record<number, DiscountForm>>({});

    const [createForm, setCreateForm] = useState<DiscountForm>({
        code: '',
        percentage: '',
        isActive: true,
        startsAt: '',
        expiresAt: '',
        maxUses: '',
        minSubtotal: '',
    });

    async function loadDiscounts() {
        setLoading(true);
        try {
            const res = await listAdminDiscounts();
            const list = Array.isArray(res.data) ? res.data : [];
            setDiscounts(list);
            const nextDrafts: Record<number, DiscountForm> = {};
            list.forEach((discount) => {
                nextDrafts[discount.id] = draftFromDiscount(discount);
            });
            setDrafts(nextDrafts);
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudieron cargar descuentos.',
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDiscounts();
    }, []);

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();

        try {
            await createAdminDiscount({
                code: createForm.code.trim(),
                percentage: Number(createForm.percentage),
                isActive: createForm.isActive,
                startsAt: createForm.startsAt.trim() || null,
                expiresAt: createForm.expiresAt.trim() || null,
                maxUses: createForm.maxUses.trim() ? Number(createForm.maxUses) : null,
                minSubtotal: createForm.minSubtotal.trim() ? Number(createForm.minSubtotal) : null,
            });
            setNotice({ tone: 'success', message: 'Descuento creado correctamente.' });
            setCreateForm({
                code: '',
                percentage: '',
                isActive: true,
                startsAt: '',
                expiresAt: '',
                maxUses: '',
                minSubtotal: '',
            });
            await loadDiscounts();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo crear descuento.',
            });
        }
    }

    async function handleUpdate(discountId: number) {
        const draft = drafts[discountId];
        if (!draft) {
            return;
        }

        try {
            await updateAdminDiscount(discountId, {
                code: draft.code.trim(),
                percentage: Number(draft.percentage),
                isActive: draft.isActive,
                startsAt: draft.startsAt.trim() || null,
                expiresAt: draft.expiresAt.trim() || null,
                maxUses: draft.maxUses.trim() ? Number(draft.maxUses) : null,
                minSubtotal: draft.minSubtotal.trim() ? Number(draft.minSubtotal) : null,
            });
            setNotice({ tone: 'success', message: 'Descuento actualizado.' });
            await loadDiscounts();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo actualizar descuento.',
            });
        }
    }

    async function handleDelete(discountId: number, code: string) {
        if (typeof window !== 'undefined') {
            const ok = window.confirm(`Vas a eliminar el descuento ${code}.`);
            if (!ok) {
                return;
            }
        }

        try {
            await deleteAdminDiscount(discountId);
            setNotice({ tone: 'success', message: `Descuento ${code} eliminado.` });
            await loadDiscounts();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo eliminar descuento.',
            });
        }
    }

    return (
        <AdminGuard>
            <AdminShell
                title="Descuentos"
                description="Gestiona codigos promocionales con CRUD completo y feedback de validacion."
            >
                {notice ? <Alert tone={notice.tone}>{notice.message}</Alert> : null}
                {loading ? <p className="status">Actualizando descuentos...</p> : null}

                <div className="admin-module-grid">
                    <section className="card">
                        <h2 className="card__title">Crear descuento</h2>
                        <form className="form" onSubmit={handleCreate}>
                            <div className="form__grid">
                                <TextField
                                    label="Codigo descuento"
                                    value={createForm.code}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, code: event.target.value }))}
                                    required
                                />
                                <TextField
                                    label="Porcentaje descuento"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="1"
                                    value={createForm.percentage}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, percentage: event.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div className="form__grid">
                                <TextField
                                    label="Inicio"
                                    value={createForm.startsAt}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, startsAt: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Expira"
                                    value={createForm.expiresAt}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                                    }
                                />
                            </div>

                            <div className="form__grid">
                                <TextField
                                    label="Max usos"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={createForm.maxUses}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, maxUses: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Min subtotal"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={createForm.minSubtotal}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, minSubtotal: event.target.value }))
                                    }
                                />
                            </div>

                            <label className="field field--checkbox">
                                <input
                                    type="checkbox"
                                    checked={createForm.isActive}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))
                                    }
                                />
                                <span className="field__label">Activo</span>
                            </label>

                            <div className="form__actions">
                                <Button type="submit">Crear descuento</Button>
                            </div>
                        </form>
                    </section>

                    <section className="card">
                        <h2 className="card__title">Editar y eliminar descuentos</h2>
                        {!discounts.length ? <p className="status">No hay descuentos registrados.</p> : null}
                        <div className="admin-list">
                            {discounts.map((discount) => {
                                const draft = drafts[discount.id] || draftFromDiscount(discount);
                                return (
                                    <article key={discount.id} className="admin-list__row">
                                        <strong>{discount.code}</strong>
                                        <div className="form__grid">
                                            <TextField
                                                label="Codigo"
                                                value={draft.code}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, code: event.target.value },
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Porcentaje"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step="1"
                                                value={draft.percentage}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, percentage: event.target.value },
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div className="form__grid">
                                            <TextField
                                                label="Inicio"
                                                value={draft.startsAt}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, startsAt: event.target.value },
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Expira"
                                                value={draft.expiresAt}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, expiresAt: event.target.value },
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div className="form__grid">
                                            <TextField
                                                label="Max usos"
                                                type="number"
                                                min={0}
                                                step="1"
                                                value={draft.maxUses}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, maxUses: event.target.value },
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Min subtotal"
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={draft.minSubtotal}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, minSubtotal: event.target.value },
                                                    }))
                                                }
                                            />
                                        </div>

                                        <label className="field field--checkbox">
                                            <input
                                                type="checkbox"
                                                checked={draft.isActive}
                                                onChange={(event) =>
                                                    setDrafts((prev) => ({
                                                        ...prev,
                                                        [discount.id]: { ...draft, isActive: event.target.checked },
                                                    }))
                                                }
                                            />
                                            <span className="field__label">Activo</span>
                                        </label>

                                        <div className="form__actions">
                                            <Button type="button" onClick={() => handleUpdate(discount.id)}>
                                                Guardar cambios
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="danger"
                                                onClick={() => handleDelete(discount.id, discount.code)}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </AdminShell>
        </AdminGuard>
    );
}
