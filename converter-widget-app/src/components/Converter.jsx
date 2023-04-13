import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { NumericFormat } from 'react-number-format'

const API_URL = 'https://demo.4dates.net/rate?date='

const Converter = () => {
  const [date, setDate] = useState(new Date())
  const convertFromUSD = true
  const [rate, setRate] = useState(21.45)
  const [amount, setAmount] = useState(1)
  const [convertResult, setConvertResult] = useState(rate)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchUrl = API_URL + format(date, 'dd.MM.yyyy')
  //   console.log('CNB url: ' + fetchUrl)
  useEffect(() => {
    async function fetchData() {
      try {
        // console.log('Try to reach CNB site...')
        const res = await fetch(fetchUrl)
        // console.log('Got response:')
        // console.log(res)
        // console.log('Response status: ' + res.status)
        // console.log('Response status text: ' + res.statusText)
        const json = await res.json()
        // console.log('Got json:')
        console.log(json)
        setRate(json.rateUSD)
        setConvertResult(Math.round(amount * json.rateUSD * 100) / 100)
      } catch (error) {
        console.log('Error: ' + error.message)
        console.log(error)
        setError(error.message)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [date])

  return (
    <>
      <label htmlFor="datePicker">Rate fixing date:</label>
      <DatePicker
        id="datePicker"
        selected={date}
        dateFormat="yyyy-MM-dd"
        maxDate={new Date()}
        calendarStartDay={1}
        onChange={(d) => setDate(d)}
      />

      <label htmlFor="amount">
        ČNB rate USD/CZK: {isLoading ? '...' : rate}
      </label>
      <br />
      <NumericFormat
        id="amount"
        value="1"
        allowNegative={false}
        thousandSeparator=","
        suffix={convertFromUSD ? ' USD' : ' CZK'}
        placeholder="Type some amount..."
        onValueChange={(values, sourceInfo) => {
          setAmount(values.floatValue)
          setConvertResult(Math.round(values.floatValue * rate * 100) / 100)
        }}
      />
      <br />
      {convertResult
        ? ` = ${convertResult.toLocaleString()} ${
            convertFromUSD ? 'CZK' : 'USD'
          }`
        : ''}
    </>
  )
}

export default Converter
