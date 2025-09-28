'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminSetup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 1. Registreer de gebruiker
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Admin User'
          }
        }
      })

      if (authError) {
        setMessage(`Auth error: ${authError.message}`)
        setLoading(false)
        return
      }

      if (authData.user) {
        // 2. Wacht even en probeer dan het profiel bij te werken
        setTimeout(async () => {
          try {
            // Update het profiel naar admin
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                organization_id: 'a0000000-0000-0000-0000-000000000001',
                role: 'owner',
                full_name: 'Admin User'
              })
              .eq('id', authData.user?.id)

            if (profileError) {
              setMessage(`Profile error: ${profileError.message}`)
            } else {
              setMessage('✅ Admin account succesvol aangemaakt! Je kunt nu naar het dashboard.')
            }
          } catch (err) {
            setMessage(`Error: ${err}`)
          }
          setLoading(false)
        }, 2000)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
      setLoading(false)
    }
  }

  const testConnection = async () => {
    try {
      const { error } = await supabase.from('organizations').select('*').limit(1)
      if (error) {
        setMessage(`❌ Database error: ${error.message}. Pas eerst de database schema toe!`)
      } else {
        setMessage('✅ Database verbinding werkt!')
      }
    } catch (err) {
      setMessage(`❌ Connection error: ${err}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Admin Setup</h1>
        
        <div className="mb-6">
          <button
            type="button"
            onClick={testConnection}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 mb-4"
          >
            Test Database Verbinding
          </button>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Minimaal 6 karakters"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Bezig...' : 'Maak Admin Account Aan'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Stappen:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Pas eerst de database schema toe in Supabase</li>
            <li>Test de database verbinding</li>
            <li>Maak een admin account aan</li>
            <li>Ga naar het dashboard om te testen</li>
          </ol>
        </div>

        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-green-600 hover:underline">
            → Ga naar Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
