import { useState } from 'react'
import { example } from 'vite-plugin-atlas/types'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { Input } from '../components/Input/Input'

export const BasicForm = example(
  () => (
    <Card title="Contact Us" description="We'd love to hear from you.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input label="Name" placeholder="Your name" />
        <Input label="Email" type="email" placeholder="you@example.com" />
        <Button variant="primary">Send Message</Button>
      </div>
    </Card>
  ),
  {
    title: 'Contact Form',
    description: 'Card, Input, and Button composed into a contact form.',
  },
)

export const WithValidation = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const nameError = submitted && !name ? 'Name is required' : undefined
  const emailError = submitted && !email.includes('@') ? 'Valid email is required' : undefined

  return (
    <Card title="Sign Up" description="Create your account.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input
          label="Name"
          placeholder="Your name"
          value={name}
          onChange={setName}
          error={nameError}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          error={emailError}
        />
        <Button variant="primary" onClick={() => setSubmitted(true)}>
          Create Account
        </Button>
      </div>
    </Card>
  )
}
WithValidation.title = 'Form with Validation'
WithValidation.description = 'Shows inline validation errors on submit.'
