'use client'

import { useState, useEffect } from 'react'
import { getBusinesses, Business, createBusiness } from '@/lib/api/businesses'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { Store, Plus } from 'lucide-react'
import Link from 'next/link'

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [newBusinessName, setNewBusinessName] = useState('')
  const [creating, setCreating] = useState(false)

  const loadBusinesses = async () => {
    try {
      setLoading(true)
      const data = await getBusinesses()
      setBusinesses(data)
    } catch (error) {
      toast.error('Failed to load businesses')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBusinesses()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBusinessName.trim()) return

    try {
      setCreating(true)
      await createBusiness({ name: newBusinessName })
      setNewBusinessName('')
      toast.success('Business created successfully')
      loadBusinesses()
    } catch (error) {
      toast.error('Failed to create business')
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Businesses</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Manage your multi-tenant stores and connected commerce spaces.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your stores</CardTitle>
              <CardDescription>Select a business to manage its inventory and users.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-neutral-300 border-t-neutral-900" />
                </div>
              ) : businesses.length === 0 ? (
                <EmptyState
                  title="No businesses yet"
                  description="Create your first business on the right to get started."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {businesses.map((business) => (
                    <Link key={business.id} href={'/businesses/'}>
                      <Card className="cursor-pointer hover:border-neutral-300 transition-colors">
                        <CardContent className="flex items-center justify-between p-5">
                          <div className="flex items-start gap-3">
                            <Store className="mt-0.5 h-5 w-5 text-neutral-400" />
                            <div>
                              <h3 className="font-medium text-sm line-clamp-1">{business.name}</h3>
                              <p className="text-xs text-neutral-500 font-mono mt-0.5">{business.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Create business</CardTitle>
              <CardDescription>Provision a new isolated tenant namespace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-neutral-800">
                    Business name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g. Acme Corp"
                    value={newBusinessName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBusinessName(e.target.value)}
                    disabled={creating}
                    required
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full" disabled={creating || !newBusinessName.trim()}>
                  {creating ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create business
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
