import { useState } from 'react'
import { SwatchIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { PRESET_COLORS } from '../common/constants'
import { useI18n } from '../contexts/I18nContext'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="color-picker">
      <button
        type="button"
        className="color-picker__trigger"
        onClick={() => setIsOpen(true)}
      >
        <span className="color-picker__preview" style={{ background: value }} />
        <span className="color-picker__label">{value || t('Pick a color')}</span>
        <SwatchIcon />
      </button>

      {isOpen && (
        <>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="modal-wrap">
            <div className="modal modal--narrow color-picker__modal">
              <div className="modal__header">
                <h3>{t('Select a Color')}</h3>
                <button type="button" onClick={() => setIsOpen(false)}>
                  <XMarkIcon />
                </button>
              </div>
              <div className="color-picker__grid">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-picker__swatch${value === c ? ' color-picker__swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => {
                      onChange(c)
                      setIsOpen(false)
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
