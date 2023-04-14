import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { NumericFormat } from 'react-number-format'
import { FaRegClock } from 'react-icons/fa'

const API_URL = 'https://demo.4dates.net/rate?date='

const Converter = () => {
  const [errorTxt, setErrorTxt] = useState()
  const [date, setDate] = useState(
    localStorage.getItem('date') !== null
      ? new Date(localStorage.getItem('date'))
      : new Date()
  )
  const convertFromUSD = true
  const [rate, setRate] = useState(0)
  const [amount, setAmount] = useState(
    localStorage.getItem('amount') !== null ? localStorage.getItem('amount') : 1
  )
  const [convertResult, setConvertResult] = useState(rate)
  const [isLoading, setIsLoading] = useState(true)

  const performConvert = (amount, rate) => {
    localStorage.setItem('amount', amount)
    const tmpRes = Math.round(amount * rate * 100) / 100
    console.log(
      `performConvert(): amount ${amount}, rate: ${rate}, result: ${tmpRes}`
    )
    setConvertResult(tmpRes)
    document.getElementById('amount').focus()
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const fetchUrl = API_URL + format(date, 'dd.MM.yyyy')
        console.log('fetchData(): ' + fetchUrl)
        const res = await fetch(fetchUrl)
        // console.log('Response status: ' + res.status)
        const json = await res.json()
        // console.log('Got json:')
        console.log(json)
        if (json.date !== format(date, 'dd.MM.yyyy')) {
          throw Error(
            'Impossible to get rate for ' + format(date, 'yyyy-MM-dd')
          )
        }
        setRate(json.rateUSD)
      } catch (error) {
        console.log('Error: ' + error.message)
        console.log(error)
        setErrorTxt(error.message)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [date])

  useEffect(() => {
    if (!isLoading) {
      performConvert(amount, rate)
    }
  }, [amount, rate, isLoading])

  return (
    <>
      <label htmlFor="datePicker">Rate fixing date:</label>
      <div>
        <div className="divInRow">
          <DatePicker
            className="divInRow"
            id="datePicker"
            selected={date}
            dateFormat="yyyy-MM-dd"
            maxDate={new Date()}
            calendarStartDay={1}
            onChange={(d) => {
              localStorage.setItem('date', d)
              setDate(d)
            }}
          />
        </div>
        <div className="divInRow">
          {format(date, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') ? (
            <FaRegClock
              onClick={() => {
                setDate(new Date())
              }}
              title="Reset to current date"
            />
          ) : (
            ''
          )}
        </div>
      </div>
      <label htmlFor="amount">
        ČNB rate USD/CZK: {isLoading || errorTxt ? '...' : rate}
      </label>
      <br />
      {errorTxt ? (
        <div className="errorMsg">{errorTxt}</div>
      ) : (
        <NumericFormat
          id="amount"
          value={amount}
          allowNegative={false}
          thousandSeparator=","
          suffix={convertFromUSD ? ' USD' : ' CZK'}
          placeholder="Type some amount..."
          onValueChange={(values, sourceInfo) => {
            setAmount(values.floatValue)
          }}
        />
      )}
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
