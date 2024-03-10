import React from 'react'
import { forwardRef, useRef, useState } from 'react'
import {
    autoUpdate,
    size,
    flip,
    useId,
    useDismiss,
    useFloating,
    useInteractions,
    useListNavigation,
    useRole,
    FloatingFocusManager,
    FloatingPortal,
} from '@floating-ui/react'
import { FormHelperText, IconButton, Input, InputAdornment } from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'

interface ItemProps {
    children: React.ReactNode
    active: boolean
}

const Item = forwardRef<HTMLDivElement, ItemProps & React.HTMLProps<HTMLDivElement>>(
    ({ children, active, ...rest }, ref) => {
        const id = useId()
        return (
            <div
                ref={ref}
                role="option"
                id={id}
                aria-selected={active}
                {...rest}
                style={{
                    background: active ? 'lightblue' : 'none',
                    padding: 4,
                    cursor: 'default',
                    ...rest.style,
                }}>
                {children}
            </div>
        )
    },
)

type InputStateType = String

function UniCombo(props: any) {
    const {
        label,
        helperText,
        error,
        data,
        name,
        value,
        onChange: formOnChange,
        onBlur,
    }: {
        label: string
        helperText?: string
        error: boolean
        data: String[]
        name: string
        value: string
        onChange: any
        onBlur: any
    } = props
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState<InputStateType>(value)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const listRef = useRef<Array<HTMLElement | null>>([])

    const { refs, floatingStyles, context } = useFloating<HTMLInputElement>({
        whileElementsMounted: autoUpdate,
        open,
        onOpenChange: setOpen,
        middleware: [
            flip({ padding: 10 }),
            size({
                apply({ rects, availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                        width: `${rects.reference.width}px`,
                        maxHeight: `${availableHeight}px`,
                    })
                },
                padding: 10,
            }),
        ],
    })

    const role = useRole(context, { role: 'listbox' })
    const dismiss = useDismiss(context)
    const listNav = useListNavigation(context, {
        listRef,
        activeIndex,
        onNavigate: setActiveIndex,
        virtual: true,
        loop: true,
    })

    const {
        getReferenceProps,
        getFloatingProps,
        getItemProps,
    }: { getReferenceProps: any; getFloatingProps: any; getItemProps: any } = useInteractions([role, dismiss, listNav])

    if (value !== inputValue) {
        setInputValue(value)
    }

    function onChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value
        setInputValue(value)

        if (value) {
            setOpen(true)
            setActiveIndex(0)
        } else {
            setOpen(false)
        }
        formOnChange(event)
    }
    const handleClearClick = () => {
        formOnChange({ target: { value: '' } })
        setInputValue('')
    }

    const handleMouseDownClear = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    const items = data.filter((item) => item.toLowerCase().includes(inputValue.toLowerCase()))

    return (
        <>
            <Input
                id={`${name}-standard-adornment`}
                autoComplete="none"
                sx={{
                    '& .MuiInputBase-input': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
                }}
                endAdornment={
                    !!inputValue && (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleClearClick}
                                onMouseDown={handleMouseDownClear}>
                                <CancelIcon />
                            </IconButton>
                        </InputAdornment>
                    )
                }
                aria-describedby={`${name}-standard-helper-text`}
                inputProps={{
                    'aria-label': 'clear',
                }}
                style={{ width: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                {...getReferenceProps({
                    ref: refs.setReference,
                    onChange,
                    value: inputValue,
                    placeholder: label,
                    'aria-autocomplete': 'list',
                    onFocus() {
                        setOpen(true)
                    },
                    onKeyDown(event) {
                        if (event.key === 'Enter' && activeIndex != null && items[activeIndex]) {
                            formOnChange({ target: { value: items[activeIndex] } })
                            setInputValue(items[activeIndex])
                            setActiveIndex(null)
                            setOpen(false)
                        }
                    },
                })}
            />
            {!!error && (
                <FormHelperText id={`${name}-helper-text`} style={{ color: 'red' }}>
                    {helperText}
                </FormHelperText>
            )}
            <FloatingPortal>
                {open && (
                    <FloatingFocusManager context={context} initialFocus={-1} visuallyHiddenDismiss>
                        <div
                            {...getFloatingProps({
                                ref: refs.setFloating,
                                style: {
                                    ...floatingStyles,
                                    background: '#eee',
                                    color: 'black',
                                    overflowY: 'auto',
                                },
                            })}>
                            {items.map((item, index) => (
                                <Item
                                    style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                    {...getItemProps({
                                        key: item,
                                        ref(node) {
                                            listRef.current[index] = node
                                        },
                                        onClick() {
                                            formOnChange({ target: { value: item } })
                                            setInputValue(item)
                                            setOpen(false)
                                            refs.domReference.current?.focus()
                                        },
                                    })}
                                    active={activeIndex === index}>
                                    {item}
                                </Item>
                            ))}
                        </div>
                    </FloatingFocusManager>
                )}
            </FloatingPortal>
        </>
    )
}

export default UniCombo
