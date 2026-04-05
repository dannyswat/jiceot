import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

import type { ExpenseType } from '../types/expense'

interface ExpenseTypePickerProps {
  expenseTypes: ExpenseType[]
  selectedTypeId: string
  onSelect: (typeId: string) => void
  placeholder?: string
  title?: string
  triggerClassName?: string
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export default function ExpenseTypePicker({
  expenseTypes,
  selectedTypeId,
  onSelect,
  placeholder = 'Select a type…',
  title = 'Select Expense Type',
  triggerClassName,
}: ExpenseTypePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedType = expenseTypes.find((type) => type.id === Number(selectedTypeId))
  const filteredTypes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) {
      return expenseTypes
    }

    return expenseTypes.filter((type) => {
      const haystack = [type.name, type.parent?.name, type.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [expenseTypes, search])

  function handleClose() {
    setIsOpen(false)
    setSearch('')
  }

  function handleSelect(typeId: string) {
    onSelect(typeId)
    handleClose()
  }

  return (
    <>
      <button
        type="button"
        className={joinClassNames('field__input', 'type-picker-trigger', triggerClassName)}
        onClick={() => setIsOpen(true)}
      >
        {selectedType ? (
          <span className="type-picker-trigger__value">
            <span className="type-picker-trigger__icon" style={{ background: selectedType.color || '#577590' }}>
              {selectedType.icon || selectedType.name.charAt(0).toUpperCase()}
            </span>
            <span className="type-picker-trigger__text">
              <span>{selectedType.name}</span>
              {selectedType.parent && <small>{selectedType.parent.name}</small>}
            </span>
          </span>
        ) : (
          <span className="type-picker-trigger__placeholder">{placeholder}</span>
        )}
      </button>

      {isOpen && createPortal(
        <>
          <div className="modal-backdrop" onClick={handleClose} />
          <div className="modal-wrap">
            <div className="modal quick-add__modal expense-type-picker__modal">
              <div className="modal__header">
                <h3>{title}</h3>
                <button type="button" onClick={handleClose} aria-label="Close expense type picker">
                  <XMarkIcon />
                </button>
              </div>

              <div className="type-picker__search expense-type-picker__search">
                <MagnifyingGlassIcon />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search expense types…"
                  autoFocus
                />
              </div>

              <div className="quick-add__body">
                {filteredTypes.length === 0 ? (
                  <p className="type-picker__empty">No types match "{search}"</p>
                ) : (
                  <div className="quick-add__grid expense-type-picker__grid">
                    {filteredTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        className={joinClassNames(
                          'quick-add__item',
                          'expense-type-picker__item',
                          selectedTypeId === type.id.toString() ? 'expense-type-picker__item--active' : undefined,
                        )}
                        onClick={() => handleSelect(type.id.toString())}
                      >
                        <span
                          className="quick-add__icon expense-type-picker__icon"
                          style={{ backgroundColor: `${type.color || '#577590'}22`, color: type.color || '#577590' }}
                        >
                          {type.icon || type.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="quick-add__label expense-type-picker__name">{type.name}</span>
                        {type.parent && <span className="expense-type-picker__meta">{type.parent.name}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}