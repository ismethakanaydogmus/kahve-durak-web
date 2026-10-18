import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { latte } from '../../test/fixtures'
import type { ProductDto } from '../../lib/types'
import { useCartStore } from '../../stores/cartStore'
import { ProductDialog } from './ProductDialog'

describe('ProductDialog', () => {
  it('starts with the default choice and its price', () => {
    render(<ProductDialog product={latte} lang="tr" onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: 'Latte' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Normal/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Sepete ekle · ₺180,00' })).toBeEnabled()
  })

  it('updates the total live and adds the line to the cart', async () => {
    const onClose = vi.fn()
    render(<ProductDialog product={latte} lang="tr" onClose={onClose} />)

    await userEvent.click(screen.getByRole('radio', { name: /Yulaf/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Artır' }))

    const add = screen.getByRole('button', { name: 'Sepete ekle · ₺420,00' })
    await userEvent.click(add)

    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
    expect(lines[0].unitPrice).toBe(210)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the price difference next to an option', () => {
    render(<ProductDialog product={latte} lang="tr" onClose={() => {}} />)

    expect(screen.getByRole('radio', { name: /Yulaf/ }).closest('label')).toHaveTextContent('+₺30,00')
    expect(screen.getByRole('radio', { name: /Normal/ }).closest('label')).not.toHaveTextContent('₺')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<ProductDialog product={latte} lang="tr" onClose={onClose} />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('cannot add while a required choice is missing', () => {
    const broken: ProductDto = {
      ...latte,
      optionGroups: [{ id: 99, nameTr: 'Süt', nameEn: 'Milk', isRequired: true, minSelect: 1, maxSelect: 1, options: [] }],
    }
    render(<ProductDialog product={broken} lang="tr" onClose={() => {}} />)

    expect(screen.getByRole('button', { name: /Sepete ekle/ })).toBeDisabled()
  })
})
