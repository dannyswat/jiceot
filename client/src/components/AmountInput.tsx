import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BackspaceIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  disabled?: boolean
  triggerClassName?: string
  hint?: string
}

const KEYPAD_KEYS = [
  '7', '8', '9', '/',
  '4', '5', '6', '*',
  '1', '2', '3', '-',
  '0', '00', '+', '=',
] as const

const OPERATORS = new Set(['+', '-', '*', '/'])

function normalizeAmountString(value: string): string {
  if (!value) {
    return ''
  }

  const normalized = value.replace(/^0+(?=\d)/, '')
  return normalized || '0'
}

function operatorPrecedence(operator: string): number {
  if (operator === '+' || operator === '-') {
    return 1
  }

  return 2
}

function applyOperator(left: number, right: number, operator: string): number | null {
  if (operator === '+') {
    return left + right
  }
  if (operator === '-') {
    return left - right
  }
  if (operator === '*') {
    return left * right
  }
  if (operator === '/') {
    if (right === 0) {
      return null
    }

    return left / right
  }

  return null
}

function evaluateAmountExpression(expression: string): number | null {
  const sanitized = expression.replace(/\s+/g, '')
  if (!sanitized) {
    return null
  }

  const values: number[] = []
  const operators: string[] = []
  let index = 0
  let expectsNumber = true

  while (index < sanitized.length) {
    const char = sanitized[index]

    if (/\d/.test(char)) {
      let end = index + 1
      while (end < sanitized.length && /\d/.test(sanitized[end])) {
        end += 1
      }

      values.push(Number(sanitized.slice(index, end)))
      expectsNumber = false
      index = end
      continue
    }

    if (!OPERATORS.has(char) || expectsNumber) {
      return null
    }

    while (
      operators.length > 0
      && operatorPrecedence(operators[operators.length - 1]) >= operatorPrecedence(char)
    ) {
      const operator = operators.pop()
      const right = values.pop()
      const left = values.pop()

      if (operator == null || left == null || right == null) {
        return null
      }

      const nextValue = applyOperator(left, right, operator)
      if (nextValue == null) {
        return null
      }

      values.push(nextValue)
    }

    operators.push(char)
    expectsNumber = true
    index += 1
  }

  if (expectsNumber) {
    return null
  }

  while (operators.length > 0) {
    const operator = operators.pop()
    const right = values.pop()
    const left = values.pop()

    if (operator == null || left == null || right == null) {
      return null
    }

    const nextValue = applyOperator(left, right, operator)
    if (nextValue == null) {
      return null
    }

    values.push(nextValue)
  }

  const result = values[0]
  if (!Number.isFinite(result) || result < 0) {
    return null
  }

  return Math.round(result)
}

function getResolvedAmount(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const evaluated = evaluateAmountExpression(trimmed)
  if (evaluated == null) {
    return null
  }

  return normalizeAmountString(evaluated.toString())
}

function sanitizeDraftInput(value: string): string {
  return value.replace(/[^\d+\-*/\s]/g, '')
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export default function AmountInput({
  value,
  onChange,
  placeholder = '0',
  title = 'Amount',
  disabled = false,
  triggerClassName,
  hint,
}: AmountInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const resolvedAmount = getResolvedAmount(draft)
  const isExpressionValid = draft.trim() === '' || resolvedAmount !== null

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  function openInput() {
    if (disabled) {
      return
    }

    setDraft(value)
    setIsOpen(true)
  }

  function closeInput() {
    setIsOpen(false)
    setDraft(value)
  }

  function applyValue() {
    if (!isExpressionValid || resolvedAmount === null) {
      return
    }

    onChange(resolvedAmount)
    setIsOpen(false)
  }

  function appendToken(token: string) {
    setDraft((currentDraft) => {
      const trimmed = currentDraft.trimEnd()

      if (token === '=') {
        const nextValue = getResolvedAmount(trimmed)
        return nextValue ?? currentDraft
      }

      if (OPERATORS.has(token)) {
        if (!trimmed) {
          return currentDraft
        }

        const lastCharacter = trimmed[trimmed.length - 1]
        if (OPERATORS.has(lastCharacter)) {
          return `${trimmed.slice(0, -1)}${token}`
        }

        return `${trimmed} ${token} `
      }

      return `${currentDraft}${token}`
    })
  }

  function removeLastCharacter() {
    setDraft((currentDraft) => currentDraft.slice(0, -1).trimEnd())
  }

  const triggerLabel = value || placeholder

  return (
    <>
      <button
        type="button"
        className={joinClassNames('field__input', 'amount-input__trigger', triggerClassName)}
        onClick={openInput}
        disabled={disabled}
        aria-label={title}
      >
        <span className={joinClassNames('amount-input__trigger-value', value ? undefined : 'amount-input__trigger-value--placeholder')}>
          {triggerLabel}
        </span>
        <span className="amount-input__trigger-badge">Calc</span>
      </button>

      {isOpen && createPortal(
        <>
          <div className="modal-backdrop" onClick={closeInput} />
          <div className="modal-wrap">
            <div className="modal modal--narrow amount-input__modal">
              <div className="modal__header">
                <div>
                  <h3>{title}</h3>
                  <p>Enter an amount or a quick calculation</p>
                </div>
                <button type="button" onClick={closeInput} aria-label="Close amount input">
                  <XMarkIcon />
                </button>
              </div>

              <div className="modal__body amount-input__body">
                <label className="amount-input__display" htmlFor="amount-input-expression">
                  <span className="amount-input__display-prefix">$</span>
                  <input
                    id="amount-input-expression"
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(sanitizeDraftInput(event.target.value))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        applyValue()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        closeInput()
                      }
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>

                <div
                  className={joinClassNames(
                    'amount-input__result',
                    draft.trim() === ''
                      ? 'amount-input__result--neutral'
                      : isExpressionValid
                        ? 'amount-input__result--valid'
                        : 'amount-input__result--invalid',
                  )}
                >
                  {draft.trim() === '' && (hint || 'Tap the keypad to enter a value')}
                  {draft.trim() !== '' && isExpressionValid && resolvedAmount !== null && `Result: $${resolvedAmount}`}
                  {draft.trim() !== '' && !isExpressionValid && 'Invalid calculation'}
                </div>

                <div className="amount-input__keypad">
                  {KEYPAD_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={joinClassNames(
                        'amount-input__key',
                        OPERATORS.has(key) || key === '=' ? 'amount-input__key--accent' : undefined,
                        key === '=' ? 'amount-input__key--equals' : undefined,
                      )}
                      onClick={() => appendToken(key)}
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="amount-input__key amount-input__key--muted"
                    onClick={() => setDraft('')}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="amount-input__key amount-input__key--muted"
                    onClick={removeLastCharacter}
                    aria-label="Delete last character"
                  >
                    <BackspaceIcon />
                  </button>
                </div>
              </div>

              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={closeInput}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={applyValue}
                  disabled={!isExpressionValid}
                >
                  Apply Amount
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}