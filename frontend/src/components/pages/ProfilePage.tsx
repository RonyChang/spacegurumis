import React, { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../lib/api/client';
import { getProfile, updateProfile, type Profile, type ProfileUpdatePayload } from '../../lib/api/profile';
import { getAuthToken } from '../../lib/session/authToken';
import { clearSession } from '../../lib/session/session';
import { consumeFlash } from '../../lib/session/flash';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

type ProfileForm = {
    firstName: string;
    lastName: string;
    receiverName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    country: string;
    city: string;
    district: string;
    postalCode: string;
    reference: string;
};

function emptyForm(): ProfileForm {
    return {
        firstName: '',
        lastName: '',
        receiverName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        country: '',
        city: '',
        district: '',
        postalCode: '',
        reference: '',
    };
}

function formFromProfile(profile: Profile | null): ProfileForm {
    if (!profile) {
        return emptyForm();
    }

    const user = profile.user || ({} as Profile['user']);
    const address = profile.address || null;

    return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        receiverName: address && address.receiverName ? address.receiverName : '',
        phone: address && address.phone ? address.phone : '',
        addressLine1: address && address.addressLine1 ? address.addressLine1 : '',
        addressLine2: address && address.addressLine2 ? address.addressLine2 : '',
        country: address && address.country ? address.country : '',
        city: address && address.city ? address.city : '',
        district: address && address.district ? address.district : '',
        postalCode: address && address.postalCode ? address.postalCode : '',
        reference: address && address.reference ? address.reference : '',
    };
}

export default function ProfilePage() {
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [syncWarning, setSyncWarning] = useState('');

    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState<ProfileForm>(emptyForm());

    const token = useMemo(() => getAuthToken(), []);

    useEffect(() => {
        if (!token) {
            window.location.assign('/login');
            return;
        }

        const warning = consumeFlash('cartSyncError');
        if (warning) {
            setSyncWarning(warning);
        }

        setStatus('loading');
        setError('');
        getProfile(token)
            .then((res) => {
                setProfile(res.data);
                setForm(formFromProfile(res.data));
            })
            .catch((err) => {
                if (err instanceof ApiError && err.status === 401) {
                    clearSession();
                    window.location.assign('/login');
                    return;
                }
                setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.');
            })
            .finally(() => setStatus('idle'));
    }, [token]);

    function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function buildPayload(): ProfileUpdatePayload {
        const payload: ProfileUpdatePayload = {};

        const firstName = form.firstName.trim();
        const lastName = form.lastName.trim();
        if (firstName) {
            payload.firstName = firstName;
        }
        if (lastName) {
            payload.lastName = lastName;
        }

        const address = {
            receiverName: form.receiverName.trim(),
            phone: form.phone.trim(),
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim(),
            country: form.country.trim(),
            city: form.city.trim(),
            district: form.district.trim(),
            postalCode: form.postalCode.trim(),
            reference: form.reference.trim(),
        };

        const hasAddressData = Object.values(address).some((value) => Boolean(value));
        if (hasAddressData) {
            payload.address = {
                receiverName: address.receiverName,
                phone: address.phone,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 || null,
                country: address.country,
                city: address.city,
                district: address.district,
                postalCode: address.postalCode || null,
                reference: address.reference || null,
            };
        }

        return payload;
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!token) {
            window.location.assign('/login');
            return;
        }

        const payload = buildPayload();
        if (!payload.firstName && !payload.lastName && !payload.address) {
            setError('No hay cambios para guardar.');
            return;
        }

        setStatus('loading');
        setError('');
        setMessage('');
        try {
            const res = await updateProfile(token, payload);
            setProfile(res.data);
            setForm(formFromProfile(res.data));
            setMessage('Perfil actualizado correctamente.');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                clearSession();
                window.location.assign('/login');
                return;
            }

            setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
        } finally {
            setStatus('idle');
        }
    }

    function handleLogout() {
        clearSession();
        window.location.assign('/');
    }

    return (
        <section className="surface page profile">
            <div className="page__header">
                <h1>Perfil</h1>
                <p className="muted">Actualiza tus datos y dirección para poder crear órdenes.</p>
            </div>

            {syncWarning ? <Alert tone="info">{syncWarning}</Alert> : null}
            {status === 'loading' ? <p className="status">Cargando...</p> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
            {message ? <Alert tone="success">{message}</Alert> : null}

            {profile ? (
                <div className="profile__meta">
                    <p className="muted">
                        Sesión: <strong>{profile.user.email}</strong>
                    </p>
                    <Button type="button" variant="danger" onClick={handleLogout}>
                        Cerrar sesión
                    </Button>
                </div>
            ) : null}

            <form className="form form--wide" onSubmit={handleSubmit}>
                <div className="form__grid">
                    <TextField
                        label="Nombre"
                        type="text"
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                    />
                    <TextField
                        label="Apellido"
                        type="text"
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                    />
                    <TextField
                        label="Receptor"
                        type="text"
                        value={form.receiverName}
                        onChange={(e) => updateField('receiverName', e.target.value)}
                    />
                    <TextField
                        label="Teléfono"
                        type="text"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                    />
                    <TextField
                        label="Dirección"
                        type="text"
                        value={form.addressLine1}
                        onChange={(e) => updateField('addressLine1', e.target.value)}
                    />
                    <TextField
                        label="Dirección 2"
                        type="text"
                        value={form.addressLine2}
                        onChange={(e) => updateField('addressLine2', e.target.value)}
                    />
                    <TextField
                        label="Distrito"
                        type="text"
                        value={form.district}
                        onChange={(e) => updateField('district', e.target.value)}
                    />
                    <TextField
                        label="Ciudad"
                        type="text"
                        value={form.city}
                        onChange={(e) => updateField('city', e.target.value)}
                    />
                    <TextField
                        label="País"
                        type="text"
                        value={form.country}
                        onChange={(e) => updateField('country', e.target.value)}
                    />
                    <TextField
                        label="Código postal"
                        type="text"
                        value={form.postalCode}
                        onChange={(e) => updateField('postalCode', e.target.value)}
                    />
                    <TextField
                        label="Referencia"
                        type="text"
                        value={form.reference}
                        onChange={(e) => updateField('reference', e.target.value)}
                    />
                </div>

                <div className="form__actions">
                    <Button type="submit" variant="primary" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Guardando...' : 'Guardar perfil'}
                    </Button>
                </div>
            </form>
        </section>
    );
}
