import { useEffect, useState } from 'react'
import axios from 'axios'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts'

function App() {

  const [income, setIncome] = useState('')
  const [expense, setExpense] = useState('')
  const [transactions, setTransactions] = useState([])
  const [aiAdvice, setAiAdvice] = useState('')

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((a, b) => a + b.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((a, b) => a + b.amount, 0)

  const balance = totalIncome - totalExpense

  const addIncome = () => {

    if (!income) return

    const data = {
      type: 'income',
      amount: Number(income)
    }

    setTransactions([...transactions, data])
    setIncome('')
  }

  const addExpense = () => {

    if (!expense) return

    const data = {
      type: 'expense',
      amount: Number(expense)
    }

    setTransactions([...transactions, data])
    setExpense('')
  }

  const getAIAdvice = async () => {

    try {

      const response = await axios.post(
        'http://localhost:5000/ai',
        {
          income: totalIncome,
          expense: totalExpense
        }
      )

      setAiAdvice(response.data.result)

    } catch (error) {

      setAiAdvice('AI advice unavailable.')

    }

  }

  useEffect(() => {

    getAIAdvice()

  }, [transactions])

  const chartData = [
    {
      name: 'Income',
      value: totalIncome
    },
    {
      name: 'Expense',
      value: totalExpense
    }
  ]

  return (

    <div style={{
      background: '#111827',
      minHeight: '100vh',
      color: 'white',
      padding: '20px',
      fontFamily: 'Arial'
    }}>

      <h1>💰 SmartFinance AI</h1>

      <div style={card}>
        <h2>Total Balance</h2>
        <h1>Rp {balance}</h1>
      </div>

      <div style={card}>

        <h2>Add Income</h2>

        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="Input income"
          style={input}
        />

        <button onClick={addIncome} style={button}>
          Add Income
        </button>

      </div>

      <div style={card}>

        <h2>Add Expense</h2>

        <input
          type="number"
          value={expense}
          onChange={(e) => setExpense(e.target.value)}
          placeholder="Input expense"
          style={input}
        />

        <button onClick={addExpense} style={button}>
          Add Expense
        </button>

      </div>

      <div style={card}>

        <h2>📊 Finance Chart</h2>

        <PieChart width={300} height={300}>

          <Pie
            data={chartData}
            dataKey="value"
            outerRadius={100}
          >

            <Cell fill="#10b981" />
            <Cell fill="#ef4444" />

          </Pie>

          <Tooltip />

        </PieChart>

      </div>

      <div style={card}>

        <h2>📈 Monthly Statistics</h2>

        <BarChart
          width={400}
          height={300}
          data={chartData}
        >

          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />

          <Bar
            dataKey="value"
            fill="#10b981"
          />

        </BarChart>

      </div>

      <div style={card}>

        <h2>🤖 AI Financial Advice</h2>

        <p>{aiAdvice}</p>

      </div>

      <div style={card}>

        <h2>📝 Transaction History</h2>

        {
          transactions.map((item, index) => (

            <p key={index}>
              {item.type} - Rp {item.amount}
            </p>

          ))
        }

      </div>

    </div>

  )
}

const card = {
  background: '#1f2937',
  padding: '20px',
  borderRadius: '10px',
  marginBottom: '20px'
}

const input = {
  width: '100%',
  padding: '10px',
  marginTop: '10px',
  marginBottom: '10px'
}

const button = {
  padding: '10px 20px',
  background: '#10b981',
  color: 'white',
  border: 'none',
  cursor: 'pointer'
}

export default App