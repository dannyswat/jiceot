import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { useI18n } from '../contexts/I18nContext'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
}

const ICON_CATEGORIES: Record<string, string[]> = {
  Finance: ['💳', '💰', '💵', '💴', '💶', '💷', '💸', '🪙', '💱', '💹', '🏦', '🏧'],
  Home: ['🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏪', '🏩', '🛏️', '🚪'],
  Utilities: ['⚡', '💡', '🔌', '💧', '🚰', '🔥', '🌡️', '❄️', '🌊'],
  Transport: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🚏', '⛽', '🅿️'],
  Food: ['🍔', '🍕', '🍗', '🍝', '🍜', '🍱', '🍙', '🍛', '🍲', '🥗', '🍿', '🧂', '🥘', '🍳', '🥞', '🧇', '🧀', '🍖', '🥩', '🌭', '🥪', '🌮', '🌯', '🥙'],
  Groceries: ['🛒', '🛍️', '🥬', '🥦', '🥒', '🌽', '🥕', '🧅', '🧄', '🥔', '🍅', '🥑', '🍆', '🌶️', '🥐', '🍞', '🥖', '🥨', '🥯', '🧈', '🥛', '🍯'],
  Entertainment: ['🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎭', '🎬', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🎨', '🖼️'],
  Media: ['📺', '📻', '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📷', '📹', '📼', '🎥', '🎞️', '📞', '☎️'],
  Health: ['💊', '💉', '🩺', '🩹', '🩼', '⚕️', '🏥', '🚑', '🧘', '🏋️', '🤸', '💆', '💇'],
  Fitness: ['💪', '🏃', '🚴', '🏊', '🤾', '🏌️', '🧗', '🤺', '🏇', '⛷️', '🏂', '🤼', '⛹️'],
  Shopping: ['👕', '👔', '👗', '👘', '👚', '👖', '🧥', '🧤', '🧣', '🧦', '👠', '👡', '👢', '👞', '👟', '🥾', '👒', '🧢', '👑', '💄', '💍', '💎', '🛍️'],
  Education: ['🎓', '📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖍️', '📏', '📐', '🧮', '🎒', '🏫', '🎨', '🖌️'],
  Travel: ['✈️', '🛫', '🛬', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '⛵', '🛶', '🚤', '🛳️', '⛴️', '🛥️', '🚢', '🛩️', '💺', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🗺️', '🧳'],
  Insurance: ['🛡️', '🔒', '🔐', '🔑', '🗝️', '⚖️', '📋', '📄', '📃'],
  Pets: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🦙', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️'],
  Other: ['📅', '📆', '🗓️', '📇', '🗂️', '📌', '📍', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '🔔', '🔕', '🎁', '🎀', '🎈', '🎉', '🎊', '✨', '🎯', '⭐', '🌟', '💫', '⚡', '🔥', '💥', '✔️', '✅', '❌', '❓', '❗', '⚠️'],
}

const ALL_ICONS = Object.values(ICON_CATEGORIES).flat()

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const filteredIcons = search
    ? ALL_ICONS.filter((icon) => icon.includes(search))
    : category === 'All'
      ? ALL_ICONS
      : ICON_CATEGORIES[category] ?? ALL_ICONS

  return (
    <div className="icon-picker">
      <div className="icon-picker__input">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2}
          placeholder="�"
        />
        <button type="button" onClick={() => setIsOpen(true)} title={t('Browse icons')}>
          <MagnifyingGlassIcon />
        </button>
      </div>

      {isOpen && createPortal(
        <>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="modal-wrap">
            <div className="modal icon-picker__modal">
              <div className="modal__header">
                <h3>{t('Select an Icon')}</h3>
                <button type="button" onClick={() => setIsOpen(false)}>
                  <XMarkIcon />
                </button>
              </div>

              <div className="icon-picker__search">
                <MagnifyingGlassIcon />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('Search icons…')}
                />
              </div>

              {!search && (
                <div className="icon-picker__categories">
                  <button
                    type="button"
                    className={category === 'All' ? 'active' : ''}
                    onClick={() => setCategory('All')}
                  >
                    {t('All')}
                  </button>
                  {Object.keys(ICON_CATEGORIES).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={category === cat ? 'active' : ''}
                      onClick={() => setCategory(cat)}
                    >
                      {t(cat)}
                    </button>
                  ))}
                </div>
              )}

              <div className="icon-picker__grid">
                {filteredIcons.length > 0 ? (
                  filteredIcons.map((icon, i) => (
                    <button
                      key={`${icon}-${i}`}
                      type="button"
                      className={value === icon ? 'selected' : ''}
                      onClick={() => {
                        onChange(icon)
                        setIsOpen(false)
                      }}
                    >
                      {icon}
                    </button>
                  ))
                ) : (
                  <p className="icon-picker__empty">{t('No icons found')}</p>
                )}
              </div>

              <p className="icon-picker__hint">{t('Tip: type an emoji directly in the input field')}</p>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
