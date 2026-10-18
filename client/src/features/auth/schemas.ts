import { z } from 'zod'

// Messages are i18n keys; forms translate them. Rules mirror api/.../Features/Auth/AuthValidators.cs.

const normalizePhone = (v: string) => v.replace(/[\s\-()]/g, '')

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'auth.required'),
  password: z.string().min(1, 'auth.required'),
})

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'auth.required').max(64, 'auth.tooLong'),
  lastName: z.string().trim().min(1, 'auth.required').max(64, 'auth.tooLong'),
  email: z.string().trim().min(1, 'auth.required').pipe(z.email('auth.invalidEmail')),
  phone: z.string().trim().min(1, 'auth.required')
    .refine((v) => /^\+?\d{10,13}$/.test(normalizePhone(v)), 'auth.invalidPhone'),
  password: z.string().min(8, 'auth.passwordTooShort').max(128, 'auth.tooLong'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
