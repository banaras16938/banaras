'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    User,
    Phone,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface Player {
    id: string
    name: string
    phone: string | null
    created_at: string
}

export default function PlayersPage() {
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [formName, setFormName] = useState('')
    const [formPhone, setFormPhone] = useState('')

    const fetchPlayers = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (searchTerm) params.append('search', searchTerm)

            const response = await fetch(`/api/players?${params.toString()}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch players')
            }

            setPlayers(data.players || [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load players')
        } finally {
            setLoading(false)
        }
    }, [searchTerm])

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchPlayers()
        }, 300)
        return () => clearTimeout(debounce)
    }, [fetchPlayers])

    const resetForm = () => {
        setFormName('')
        setFormPhone('')
        setSelectedPlayer(null)
    }

    const handleAddPlayer = async () => {
        if (!formName.trim()) {
            toast.error('Player name is required')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName.trim(),
                    phone: formPhone.trim() || null
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add player')
            }

            toast.success('Player added successfully')
            setShowAddModal(false)
            resetForm()
            fetchPlayers()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add player')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditPlayer = async () => {
        if (!selectedPlayer || !formName.trim()) {
            toast.error('Player name is required')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/players', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedPlayer.id,
                    name: formName.trim(),
                    phone: formPhone.trim() || null
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update player')
            }

            toast.success('Player updated successfully')
            setShowEditModal(false)
            resetForm()
            fetchPlayers()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update player')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeletePlayer = async () => {
        if (!selectedPlayer) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`/api/players?id=${selectedPlayer.id}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete player')
            }

            toast.success('Player deleted successfully')
            setShowDeleteModal(false)
            resetForm()
            fetchPlayers()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete player')
        } finally {
            setIsSubmitting(false)
        }
    }

    const openEditModal = (player: Player) => {
        setSelectedPlayer(player)
        setFormName(player.name)
        setFormPhone(player.phone || '')
        setShowEditModal(true)
    }

    const openDeleteModal = (player: Player) => {
        setSelectedPlayer(player)
        setShowDeleteModal(true)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Players</h1>
                    <p className="text-gray-400">
                        Manage your players for bet placement
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchPlayers}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <Button
                        onClick={() => {
                            resetForm()
                            setShowAddModal(true)
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Player
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                    <Input
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="!pl-12"
                    />
                </div>
            </Card>

            {/* Players List */}
            <Card>
                <CardHeader
                    title="All Players"
                    subtitle={`${players.length} player${players.length !== 1 ? 's' : ''} found`}
                />

                {loading ? (
                    <div className="py-12 flex justify-center">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : players.length === 0 ? (
                    <div className="py-12 text-center">
                        <User size={48} className="mx-auto text-gray-500 mb-4" />
                        <p className="text-gray-400">
                            {searchTerm ? 'No players found matching your search' : 'No players yet. Add your first player!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                        <User size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-lg text-white">{player.name}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            {player.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={14} />
                                                    {player.phone}
                                                </span>
                                            )}
                                            <span>Added {formatDate(player.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(player)}
                                        className="p-2 rounded-lg hover:bg-gray-600 transition-colors text-gray-400 hover:text-indigo-400"
                                        title="Edit player"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(player)}
                                        className="p-2 rounded-lg hover:bg-gray-600 transition-colors text-gray-400 hover:text-red-400"
                                        title="Delete player"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Add Player Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false)
                    resetForm()
                }}
                title="Add New Player"
            >
                <div className="space-y-4">
                    <Input
                        label="Player Name"
                        placeholder="Enter player name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        autoFocus
                    />
                    <Input
                        label="Phone Number (Optional)"
                        placeholder="Enter phone number"
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                    />
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowAddModal(false)
                                resetForm()
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleAddPlayer}
                            isLoading={isSubmitting}
                        >
                            Add Player
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Player Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false)
                    resetForm()
                }}
                title="Edit Player"
            >
                <div className="space-y-4">
                    <Input
                        label="Player Name"
                        placeholder="Enter player name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        autoFocus
                    />
                    <Input
                        label="Phone Number (Optional)"
                        placeholder="Enter phone number"
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                    />
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowEditModal(false)
                                resetForm()
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleEditPlayer}
                            isLoading={isSubmitting}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setSelectedPlayer(null)
                }}
                title="Delete Player"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Are you sure you want to delete <strong className="text-white">{selectedPlayer?.name}</strong>?
                    </p>
                    <p className="text-sm text-yellow-400">
                        Note: Players with existing bets cannot be deleted.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowDeleteModal(false)
                                setSelectedPlayer(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={handleDeletePlayer}
                            isLoading={isSubmitting}
                        >
                            Delete Player
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
