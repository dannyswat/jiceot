import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

const ICON_CATEGORIES = {
  'Finance': ['💳', '💰', '💵', '💴', '💶', '💷', '💸', '🪙', '💱', '💹', '🏦', '🏧'],
  'Home': ['🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏪', '🏩', '🛏️', '🚪'],
  'Utilities': ['⚡', '💡', '🔌', '💧', '🚰', '🔥', '🌡️', '❄️', '🌊'],
  'Transport': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🚏', '⛽', '🅿️'],
  'Food': ['🍔', '🍕', '🍗', '🍝', '🍜', '🍱', '🍙', '🍛', '🍲', '🥗', '🍿', '🧂', '🥘', '🍳', '🥞', '🧇', '🧀', '🍖', '🥩', '🌭', '🥪', '🌮', '🌯', '🥙'],
  'Groceries': ['🛒', '🛍️', '🥬', '🥦', '🥒', '🌽', '🥕', '🧅', '🧄', '🥔', '🍅', '🥑', '🍆', '🌶️', '🥐', '🍞', '🥖', '🥨', '🥯', '🧈', '🥛', '🍯'],
  'Entertainment': ['🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎭', '🎬', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🎨', '🖼️', '🎰'],
  'Media': ['📺', '📻', '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📷', '📹', '📼', '🎥', '🎞️', '📞', '☎️'],
  'Health': ['💊', '💉', '🩺', '🩹', '🩼', '⚕️', '🏥', '🚑', '🧘', '🏋️', '🤸', '🧘‍♀️', '💆', '💇'],
  'Fitness': ['💪', '🏃', '🚴', '🏊', '🤾', '🏌️', '🧗', '🤺', '🏇', '⛷️', '🏂', '🤼', '⛹️'],
  'Shopping': ['👕', '👔', '👗', '👘', '👚', '👖', '🧥', '🧤', '🧣', '🧦', '👠', '👡', '👢', '👞', '👟', '🥾', '👒', '🧢', '👑', '💄', '💍', '💎', '🛍️'],
  'Education': ['🎓', '📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖍️', '📏', '📐', '🧮', '🎒', '🏫', '🎨', '🖌️'],
  'Travel': ['✈️', '🛫', '🛬', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🛺', '🛴', '🛵', '🏍️', '🚲', '⛵', '🛶', '🚤', '🛳️', '⛴️', '🛥️', '🚢', '✈️', '🛩️', '🛫', '🛬', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🗺️', '🧳'],
  'Insurance': ['🛡️', '🔒', '🔐', '🔑', '🗝️', '⚖️', '📋', '📄', '📃'],
  'Pets': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🦙', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️'],
  'Other': ['📅', '📆', '🗓️', '📇', '🗂️', '📌', '📍', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '🔔', '🔕', '🎁', '🎀', '🎈', '🎉', '🎊', '✨', '🎯', '⭐', '🌟', '💫', '⚡', '🔥', '💥', '✔️', '✅', '❌', '❓', '❗', '⚠️'],
};

const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredIcons = searchTerm
    ? ALL_ICONS.filter(icon => icon.includes(searchTerm))
    : activeCategory === 'All'
    ? ALL_ICONS
    : ICON_CATEGORIES[activeCategory as keyof typeof ICON_CATEGORIES] || ALL_ICONS;

  return (
    <div className="relative w-full">
      <div className="flex items-center border border-gray-300 rounded overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 border-none text-center focus:outline-none min-w-0"
          maxLength={2}
          placeholder="🔍"
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-shrink-0 px-2 py-1 border-l border-gray-300 hover:bg-gray-50 focus:outline-none"
          title="Browse icons"
        >
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Select an Icon</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search icons..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Categories */}
              {!searchTerm && (
                <div className="border-b">
                  <div className="px-4 py-2 overflow-x-auto">
                    <div className="flex space-x-2 min-w-max">
                      <button
                        onClick={() => setActiveCategory('All')}
                        className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                          activeCategory === 'All'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      {Object.keys(ICON_CATEGORIES).map((category) => (
                        <button
                          key={category}
                          onClick={() => setActiveCategory(category)}
                          className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                            activeCategory === category
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Icons Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredIcons.length > 0 ? (
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
                    {filteredIcons.map((icon, index) => (
                      <button
                        key={`${icon}-${index}`}
                        type="button"
                        onClick={() => {
                          onChange(icon);
                          setIsOpen(false);
                        }}
                        className={`aspect-square flex items-center justify-center text-2xl rounded-lg hover:bg-blue-50 transition-colors border-2 ${
                          value === icon ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                        }`}
                        title={icon}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No icons found matching "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
                <p>Tip: You can also type an emoji directly in the input field</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
