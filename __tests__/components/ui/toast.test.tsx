import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ToastProvider, useToast } from '@/components/ui/toast'

// Test component to use the toast hook
function TestComponent() {
  const { addToast } = useToast()

  return (
    <div>
      <button
        onClick={() => addToast({ type: 'success', title: 'Success Message' })}
        data-testid="success-button"
      >
        Add Success Toast
      </button>
      <button
        onClick={() => addToast({ type: 'error', title: 'Error Message', message: 'Something went wrong' })}
        data-testid="error-button"
      >
        Add Error Toast
      </button>
      <button
        onClick={() => addToast({ type: 'warning', title: 'Warning Message' })}
        data-testid="warning-button"
      >
        Add Warning Toast
      </button>
      <button
        onClick={() => addToast({ type: 'info', title: 'Info Message' })}
        data-testid="info-button"
      >
        Add Info Toast
      </button>
    </div>
  )
}

const ToastTestWrapper = () => (
  <ToastProvider>
    <TestComponent />
  </ToastProvider>
)

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('displays success toast with correct styling', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('success-button'))

    expect(screen.getByText('Success Message')).toBeInTheDocument()
    const toast = screen.getByText('Success Message').closest('div')
    expect(toast).toHaveClass('bg-green-50')
  })

  it('displays error toast with message', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('error-button'))

    expect(screen.getByText('Error Message')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    const toast = screen.getByText('Error Message').closest('div')
    expect(toast).toHaveClass('bg-red-50')
  })

  it('displays warning toast with correct styling', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('warning-button'))

    expect(screen.getByText('Warning Message')).toBeInTheDocument()
    const toast = screen.getByText('Warning Message').closest('div')
    expect(toast).toHaveClass('bg-yellow-50')
  })

  it('displays info toast with correct styling', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('info-button'))

    expect(screen.getByText('Info Message')).toBeInTheDocument()
    const toast = screen.getByText('Info Message').closest('div')
    expect(toast).toHaveClass('bg-blue-50')
  })

  it('removes toast when close button is clicked', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('success-button'))
    expect(screen.getByText('Success Message')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: '' }) // Close button has no text
    fireEvent.click(closeButton)

    act(() => {
      jest.advanceTimersByTime(200) // Wait for animation
    })

    expect(screen.queryByText('Success Message')).not.toBeInTheDocument()
  })

  it('auto-removes toast after duration', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('success-button'))
    expect(screen.getByText('Success Message')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(5000) // Default duration
    })

    expect(screen.queryByText('Success Message')).not.toBeInTheDocument()
  })

  it('displays multiple toasts', () => {
    render(<ToastTestWrapper />)

    fireEvent.click(screen.getByTestId('success-button'))
    fireEvent.click(screen.getByTestId('error-button'))

    expect(screen.getByText('Success Message')).toBeInTheDocument()
    expect(screen.getByText('Error Message')).toBeInTheDocument()
  })

  it('throws error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleSpy.mockRestore()
  })
})