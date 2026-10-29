import { z } from 'zod';

/**
 * Edad cumplida en años calendario, calculada sobre fechas calendario en UTC.
 *
 * El cálculo es INDEPENDIENTE DEL TIMEZONE y es IDÉNTICO al del servidor
 * (`serverapp/src/modules/auth/auth.service.ts` → `calculateAge`): se usan los
 * getters UTC en ambos lados. `new Date("YYYY-MM-DD")` parsea a medianoche UTC,
 * por lo que `getUTC*` devuelve exactamente el día que el usuario tipeó.
 *
 * Antes se comparaba contra los getters LOCALES: en cualquier navegador al
 * oeste de UTC (p.ej. `America/Caracas`) el gate del cliente aceptaba a quien
 * cumplía 18 años un día antes de su cumpleaños, y el navegador podía discrepar
 * del servidor.
 */
export const ageInCalendarYears = (birthDate: Date, today: Date): number => {
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
        age -= 1;
    }
    return age;
};

export const registerSchema = z.object({
    firstName: z.string().min(2, 'El nombre es requerido'),
    lastName: z.string().min(2, 'El apellido es requerido'),
    email: z.string().email('Correo inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
    referralCode: z.string().optional(), // Este es el campo del referido
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { error: 'El género es requerido' }),
    // S7 (legal-compliance): gate de edad — el backend también valida (>= 18).
    birthDate: z.string().min(1, 'La fecha de nacimiento es requerida').refine((v) => {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return false;
        return ageInCalendarYears(d, new Date()) >= 18;
    }, { message: 'Debes ser mayor de 18 años para crear una cuenta' }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;
