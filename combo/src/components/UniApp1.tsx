import React, { useContext, useRef } from 'react'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Autocomplete, Button, TextField } from '@mui/material'

import { UniAppContext } from './UniAppProvider'
import { Alert } from './Alert'
import './UniApp.css'

const backendUrl =
    location.hostname === 'localhost'
        ? 'http://universities.hipolabs.com/search?country=Czech+Republic&name='
        : 'https://combo.4dates.net/v1/uni-cz'

interface IUniAppFormInputs {
    name: string
    uni: string
}
const UniApp1 = () => {
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
        const uniName = data[formData.uni].name
        // console.log('onSubmit(): form data:', formData, ', uni name:', uniName)
        actions.setInfo({ name: formData.name, uni: uniName })
        setValue('name', '')
        setValue('uni', '')
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
                            variant="standard"
                            sx={{
                                '& .MuiInputBase-input': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                },
                            }}
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
                        }}
                        render={({ field }) => (
                            <Autocomplete
                                openOnFocus
                                selectOnFocus
                                options={data.map((option: any) => option.name)}
                                isOptionEqualToValue={(option: any, value: any) => {
                                    return option.name === value.name
                                }}
                                getOptionLabel={(option: any) => {
                                    if (typeof option === 'number') {
                                        return data[option].name
                                    } else {
                                        return option
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        variant="standard"
                                        {...params}
                                        label="University"
                                        helperText={!!errors.uni && errors.uni.message}
                                        error={!!errors.uni}
                                    />
                                )}
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

export default UniApp1
