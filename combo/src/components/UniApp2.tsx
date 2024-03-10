import React, { useContext, useRef } from 'react'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Button, TextField } from '@mui/material'

import { UniAppContext } from './UniAppProvider'
import { Alert } from './Alert'
import UniCombo from './UniCombo'
import './UniApp.css'

const backendUrl =
    location.hostname === 'localhost'
        ? 'http://universities.hipolabs.com/search?country=Czech+Republic&name='
        : 'https://combo.4dates.net/v1/uni-cz'

interface IUniAppFormInputs {
    name: string
    uni: string
}
const UniApp2 = () => {
    const { state, actions } = useContext(UniAppContext)
    const submitRef = useRef(null)
    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm({
        defaultValues: {
            name: '',
            uni: '',
        },
    })
    const onSubmit: SubmitHandler<IUniAppFormInputs> = (formData) => {
        // console.log('onSubmit(): form data:', formData, ', uni name:', formData.uni)
        if (data.map((option: any) => option.name).includes(formData.uni)) {
            actions.setInfo({ name: formData.name, uni: formData.uni })
            setValue('name', '')
            setValue('uni', '')
        } else {
            actions.setInfo('Non-existing university: ' + formData.uni)
        }
    }
    const {
        isPending,
        error: loadError,
        data,
    } = useQuery({
        queryKey: ['uniData'],
        queryFn: () => axios.get(backendUrl).then((res) => res.data),
    })
    if (loadError) return 'University list loading error: ' + loadError.message
    // console.log('render(): errors:', errors)

    return (
        <div className="UniAppContainer">
            <form onSubmit={handleSubmit(onSubmit)}>
                <Controller
                    name="name"
                    control={control}
                    rules={{
                        required: 'Name is required',
                        pattern: {
                            value: /^[a-zA-Z ]+$/,
                            message: 'Name can contain only letters',
                        },
                        maxLength: {
                            value: 50,
                            message: 'Max name length is 50 chars',
                        },
                    }}
                    render={({ field }) => (
                        <TextField
                            style={{ width: '100%' }}
                            sx={{
                                '& .MuiInputBase-input': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                },
                            }}
                            variant="standard"
                            placeholder="Name"
                            helperText={!!errors.name ? errors.name.message : ''}
                            autoFocus={true}
                            error={!!errors.name}
                            {...field}
                        />
                    )}
                />
                {isPending && <div>Loading...</div>}
                {!isPending && (
                    <Controller
                        name="uni"
                        control={control}
                        rules={{
                            required: 'University is required',
                            maxLength: {
                                value: 100,
                                message: 'Max length is 100 chars',
                            },
                            validate: {
                                nameUni: (v) => {
                                    const items = data
                                        .map((option: any) => option.name)
                                        .filter((item: String) => item.toLowerCase().includes(v.trim().toLowerCase()))
                                    if (items.length) {
                                        return true
                                    } else {
                                        return 'Non-existing university'
                                    }
                                },
                            },
                        }}
                        render={({ field }) => (
                            <UniCombo
                                label="University"
                                helperText={!!errors.uni ? errors.uni.message : ''}
                                error={!!errors.uni}
                                data={data.map((option: any) => option.name)}
                                {...field}
                            />
                        )}
                    />
                )}
                <div className="UniAppSubmitButton">
                    <Button variant="contained" type="submit" ref={submitRef}>
                        Submit
                    </Button>
                </div>
            </form>
            <Alert />
        </div>
    )
}

export default UniApp2
