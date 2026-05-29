import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {

  res.send('SmartFinance AI Backend Running')

})

app.post('/ai', async (req, res) => {

  const { income, expense } = req.body

  let advice = ''

  if (expense > income) {

    advice =
      'Pengeluaran Anda lebih besar dari pemasukan. Kurangi pengeluaran bulanan.'

  } else if (expense > income * 0.7) {

    advice =
      'Pengeluaran cukup tinggi. Cobalah mengurangi belanja tidak penting.'

  } else {

    advice =
      'Keuangan Anda cukup stabil. Pertahankan pengelolaan keuangan.'

  }

  res.json({
    result: advice
  })

})

app.listen(5000, () => {

  console.log('Server running on port 5000')

})