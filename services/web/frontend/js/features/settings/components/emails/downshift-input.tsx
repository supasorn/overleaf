import { useState, useEffect, forwardRef } from 'react'
import { useCombobox } from 'downshift'
import classnames from 'classnames'
import { escapeRegExp } from 'lodash'
import { bsVersion } from '@/features/utils/bootstrap-5'
import FormControlWrapper from '@/features/ui/components/bootstrap-5/wrappers/form-control-wrapper'

type DownshiftInputProps = {
  highlightMatches?: boolean
  items: string[]
  itemsTitle?: string
  inputValue: string
  label: string
  setValue: (value: string) => void
  inputRef?: React.ForwardedRef<HTMLInputElement>
  showLabel?: boolean
  showSuggestedText?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>

const filterItemsByInputValue = (
  items: DownshiftInputProps['items'],
  inputValue: DownshiftInputProps['inputValue']
) => items.filter(item => item.toLowerCase().includes(inputValue.toLowerCase()))

function Downshift({
  highlightMatches = false,
  items,
  itemsTitle,
  inputValue,
  placeholder,
  label,
  setValue,
  disabled,
  inputRef,
  showLabel = false,
  showSuggestedText = false,
}: DownshiftInputProps) {
  const [inputItems, setInputItems] = useState(items)

  useEffect(() => {
    setInputItems(items)
  }, [items])

  const {
    isOpen,
    getLabelProps,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    getItemProps,
    highlightedIndex,
    openMenu,
    selectedItem,
  } = useCombobox({
    inputValue,
    items: inputItems,
    initialSelectedItem: inputValue,
    onSelectedItemChange: ({ selectedItem }) => {
      setValue(selectedItem ?? '')
    },
    onInputValueChange: ({ inputValue = '' }) => {
      setInputItems(filterItemsByInputValue(items, inputValue))
    },
    onStateChange: ({ type }) => {
      if (type === useCombobox.stateChangeTypes.FunctionOpenMenu) {
        setInputItems(filterItemsByInputValue(items, inputValue))
      }
    },
  })

  const highlightMatchedCharacters = (item: string, query: string) => {
    if (!query || !highlightMatches) return item
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
    const parts = item.split(regex)
    return parts.map((part, index) =>
      regex.test(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part
    )
  }

  return (
    <div
      className={classnames(
        'ui-select-container ui-select-bootstrap dropdown',
        {
          open: isOpen && inputItems.length,
        }
      )}
    >
      <div {...getComboboxProps()}>
        {/* eslint-disable-next-line jsx-a11y/label-has-for */}
        <label
          {...getLabelProps()}
          className={
            showLabel
              ? ''
              : bsVersion({ bs5: 'visually-hidden', bs3: 'sr-only' })
          }
        >
          {label}
        </label>
        <FormControlWrapper
          {...getInputProps({
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              setValue(event.target.value)
            },
            onFocus: () => {
              if (!isOpen) {
                openMenu()
              }
            },
            ref: inputRef,
          })}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      <ul
        {...getMenuProps()}
        className="ui-select-choices ui-select-choices-content ui-select-dropdown dropdown-menu"
      >
        {showSuggestedText && inputItems.length && (
          <li className="ui-select-title">{itemsTitle}</li>
        )}
        {inputItems.map((item, index) => (
          <li
            className="ui-select-choices-group"
            key={`${item}${index}`}
            {...getItemProps({ item, index })}
          >
            <div
              className={classnames('ui-select-choices-row', {
                active: selectedItem === item,
                'ui-select-choices-row--highlighted':
                  highlightedIndex === index,
              })}
            >
              <span className="ui-select-choices-row-inner">
                <span>{highlightMatchedCharacters(item, inputValue)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DownshiftInput = forwardRef<
  HTMLInputElement,
  Omit<DownshiftInputProps, 'inputRef'>
>((props, ref) => <Downshift {...props} inputRef={ref} />)

DownshiftInput.displayName = 'DownshiftInput'

export default DownshiftInput
