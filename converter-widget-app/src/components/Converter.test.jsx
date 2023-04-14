import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Converter from './Converter'
import { act } from 'react-dom/test-utils'

describe('UI tests', () => {
  test('Test 1: Renders label: rate USD/CZK', () => {
    render(<Converter />)
    const labelElement = screen.getByText(/rate USD\/CZK/i)
    expect(labelElement).toBeInTheDocument()
  })
  test('Test 2: Changes conversion amount to 102 USD', async () => {
    render(<Converter />)
    const amountInput = screen.getByTitle('amount')
    act(() => {
      userEvent.type(amountInput, '02')
    })
    expect(amountInput).toHaveValue('102 USD')
  })
})

describe('Business logic tests', () => {
  test('Test 3: Gets currency rate for 01.01.2023', async () => {
    render(<Converter testDate="01.01.2023" />)
    const rateSpan = await waitFor(() => screen.getByTestId('rate'))
    const rate = Number(rateSpan.getAttribute('rate'))
    console.log('rate: ' + rate)
    expect(rate).toEqual(22.616)
  }),
    test('Test 4: Performs conversion of 102 USD', async () => {
      render(<Converter testDate="01.01.2023" />)
      // change amount to 102 USD
      const amountInput = screen.getByTitle('amount')
      act(() => {
        userEvent.type(amountInput, '02')
      })
      console.log('test 4: anmount: ' + amountInput.getAttribute('value'))
      expect(amountInput).toHaveValue('102 USD')

      // get rate for 1.1.2023
      const rateSpan = await waitFor(() => screen.getByTestId('rate'))
      const rate = Number(rateSpan.getAttribute('rate'))
      console.log('test 4: rate: ' + rate)
      expect(rate).toEqual(22.616)

      // get conversion result
      const resultSpan = await waitFor(() => screen.getByTestId('result'))
      const result = resultSpan.getAttribute('result')
      console.log('test 4: convert result: ' + result)
      expect(result).toEqual('2,306.83')
    })
})
