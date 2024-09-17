import { NextResponse } from 'next/server'
import OpenAI from "openai"

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
})

export async function POST(request: Request) {
  try {
    const { message } = await request.json()
    console.log('Received message:', message)

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message }
      ],
      model: "deepseek-chat",
    })

    const aiResponse = completion.choices[0].message.content
    console.log('AI Response:', aiResponse)
    return NextResponse.json({ message: aiResponse })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ message: 'An error occurred while processing your request.' }, { status: 500 })
  }
}
