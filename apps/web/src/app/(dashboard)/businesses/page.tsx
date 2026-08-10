'use client'

import { useState, useEffect } from 'react'
import { getBusinesses, Business, createBusiness } from '@/lib/api/businesses'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Store, Plus, ArrowRight } from 'lucide-react'
import { motion, Variants } from 'framer-motion'
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

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 pb-2">
            Businesses
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Manage your multi-tenant stores and connected commerce spaces.
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-none shadow-md bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Your Stores</CardTitle>
              <CardDescription>Select a business to manage its inventory and users.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : businesses.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center p-12 border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-800/20"
                >
                  <Store className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-medium">No businesses yet</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                    Create your first business on the right to get started with your commerce journey.
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {businesses.map((business) => (
                    <motion.div key={business.id} variants={item}>
                      <Link href={"/businesses/"}>
                        <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10 bg-white dark:bg-gray-950">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                  <Store className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <h3 className="font-semibold text-lg line-clamp-1">{business.name}</h3>
                                  <p className="text-sm text-muted-foreground font-mono mt-1">{business.id.substring(0, 8)}</p>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">
                                <ArrowRight className="w-5 h-5 text-primary" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6 border-none shadow-md bg-primary/5 dark:bg-primary/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Create Business</CardTitle>
              <CardDescription>Provision a completely new isolated tenant namespace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2.5">
                  <label htmlFor="name" className="text-sm font-medium">
                    Business Name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g. Acme Corp"
                    value={newBusinessName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBusinessName(e.target.value)}
                    disabled={creating}
                    required
                    className="bg-white dark:bg-gray-950 border-primary/20 focus-visible:ring-primary/30"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all" 
                  disabled={creating || !newBusinessName.trim()}
                >
                  {creating ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Launch Instance
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
