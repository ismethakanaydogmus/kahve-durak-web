import type { ReactNode } from 'react'

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <section className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-4xl text-bean">{title}</h1>
      <div className="mt-8">{children}</div>
      <p className="mt-8 text-center text-muted">{footer}</p>
    </section>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900">{message}</p>
}
