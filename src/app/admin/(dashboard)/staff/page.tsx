'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Staff } from '@/types/types'
import {
    UserPlus,
    Trash2,
    Copy,
    Check,
    Search,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<Staff[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showCredentialsModal, setShowCredentialsModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
    const [newCredentials, setNewCredentials] = useState({ email: '', password: '' })
    const [copied, setCopied] = useState<string | null>(null)

    // Create Form state
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPhone, setNewPhone] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    // Load staff
    const loadStaff = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/staff')
            const data = await response.json()
            if (response.ok) {
                setStaff(data.profiles || [])
            } else {
                toast.error(data.error || 'Failed to load staff')
            }
        } catch (error) {
            console.error(error)
            toast.error('Network error loading staff')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadStaff()
    }, [])

    const filteredStaff = staff.filter((s) =>
        (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    const handleCreateStaff = async () => {
        setIsCreating(true)

        // Auto-generate a password for better security
        const password = generatePassword()

        try {
            const response = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: password,
                    name: newName,
                    phone: newPhone
                })
            })

            const data = await response.json()

            if (response.ok && data.profile) {
                setStaff([data.profile, ...staff])
                setNewCredentials({ email: newEmail, password })
                setShowCreateModal(false)
                setShowCredentialsModal(true)

                // Reset form
                setNewName('')
                setNewEmail('')
                setNewPhone('')
                toast.success('Staff account created successfully')
            } else {
                toast.error(data.error || 'Failed to create staff')
            }
        } catch (error) {
            console.error(error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteStaff = async () => {
        if (!selectedStaff) return

        try {
            const response = await fetch(`/api/staff?userId=${selectedStaff.id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                setStaff(staff.filter((s) => s.id !== selectedStaff.id))
                toast.success('Staff member removed')
            } else {
                const data = await response.json()
                toast.error(data.error || 'Failed to delete staff')
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to communicate with server')
        } finally {
            setShowDeleteModal(false)
            setSelectedStaff(null)
        }
    }

    const handleToggleActive = async (staffMember: Staff) => {
        // Optimistic update
        const originalStatus = staffMember.is_active
        setStaff(staff.map((s) =>
            s.id === staffMember.id ? { ...s, is_active: !s.is_active } : s
        ))

        try {
            const response = await fetch('/api/staff', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId: staffMember.id,
                    is_active: !originalStatus
                })
            })

            if (!response.ok) {
                // Revert
                setStaff(staff.map((s) =>
                    s.id === staffMember.id ? { ...s, is_active: originalStatus } : s
                ))
                const data = await response.json()
                toast.error(data.error || 'Update failed')
            } else {
                toast.success(`Staff account ${!originalStatus ? 'activated' : 'deactivated'}`)
            }
        } catch (error) {
            // Revert
            setStaff(staff.map((s) =>
                s.id === staffMember.id ? { ...s, is_active: originalStatus } : s
            ))
            toast.error('Network error')
        }
    }

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Staff Directory</h1>
                    <p className="text-[var(--text-secondary)]">
                        Manage your team, permissions, and account status
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={loadStaff} disabled={isLoading}>
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <UserPlus size={18} />
                        Add New Staff
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="grid grid-cols-1">
                <Card>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="!pl-12"
                        />
                    </div>
                </Card>
            </div>

            {/* Stats */}
            {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="text-center">
                        <p className="text-sm text-[var(--text-muted)]">Total Staff</p>
                        <p className="text-2xl font-bold">{staff.length}</p>
                    </Card>
                    <Card className="text-center">
                        <p className="text-sm text-[var(--text-muted)]">Active</p>
                        <p className="text-2xl font-bold text-[var(--status-success)]">
                            {staff.filter((s) => s.is_active).length}
                        </p>
                    </Card>
                    <Card className="text-center">
                        <p className="text-sm text-[var(--text-muted)]">Inactive</p>
                        <p className="text-2xl font-bold text-[var(--status-error)]">
                            {staff.filter((s) => !s.is_active).length}
                        </p>
                    </Card>
                </div>
            )}

            {/* Staff List */}
            <Card className="overflow-hidden">
                <div className="table-container w-full">
                    {isLoading ? (
                        <div className="p-12 text-center text-[var(--text-muted)]">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
                            <p>Loading staff list...</p>
                        </div>
                    ) : (
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th className="whitespace-nowrap">Name / Email</th>
                                    <th className="hidden md:table-cell">Phone</th>
                                    <th className="whitespace-nowrap">Status</th>
                                    <th className="hidden lg:table-cell">Last Login</th>
                                    <th className="hidden sm:table-cell">Created</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-[var(--text-muted)]">
                                            {searchTerm ? 'No matching staff found' : 'No staff members added yet'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStaff.map((s) => (
                                        <tr key={s.id}>
                                            <td>
                                                <div className="font-medium">{s.name || 'Unnamed Staff'}</div>
                                                <div className="text-xs text-[var(--text-muted)] font-mono">{s.email}</div>
                                            </td>
                                            <td className="text-[var(--text-muted)] hidden md:table-cell">{s.phone || '-'}</td>
                                            <td>
                                                <button onClick={() => handleToggleActive(s)} className="focus:outline-none">
                                                    <Badge
                                                        variant={s.is_active ? 'success' : 'error'}
                                                        dot
                                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    >
                                                        {s.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </button>
                                            </td>
                                            <td className="text-[var(--text-muted)] hidden lg:table-cell">
                                                {s.last_login
                                                    ? new Date(s.last_login).toLocaleDateString() + ' ' + new Date(s.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : 'Never'
                                                }
                                            </td>
                                            <td className="text-[var(--text-muted)] hidden sm:table-cell">
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedStaff(s)
                                                        setShowDeleteModal(true)
                                                    }}
                                                    className="p-2 hover:bg-[var(--status-error)]/10 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--status-error)] inline-block"
                                                    title="Remove Staff"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Create Staff Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Add New Staff Member"
            >
                <div className="space-y-4">
                    <Input
                        label="Full Name"
                        placeholder="e.g. John Doe"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="e.g. staff@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        helperText="Used for login access"
                    />
                    <Input
                        label="Phone Number"
                        placeholder="e.g. +91 98765 00000"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                    />

                    <div className="p-3 bg-[var(--primary-500)]/5 border border-[var(--primary-500)]/20 rounded-lg text-sm text-[var(--text-secondary)]">
                        <p>A random strong password will be generated automatically. You will view it in the next step.</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowCreateModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleCreateStaff}
                            isLoading={isCreating}
                            disabled={!newName.trim() || !newEmail.trim()}
                        >
                            Create Account
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Credentials Modal */}
            <Modal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
                title="Account Created Successfully"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30">
                        <p className="text-sm text-[var(--status-warning)] font-medium">
                            ⚠️ Important: Copy these credentials now. The password cannot be viewed again.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between border border-[var(--glass-border)]">
                            <div className="overflow-hidden">
                                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Email / Login ID</p>
                                <p className="font-mono font-bold truncate">{newCredentials.email}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(newCredentials.email, 'email')}
                                className="p-2 hover:bg-[var(--glass-border)] rounded-lg transition-colors ml-2"
                            >
                                {copied === 'email' ? (
                                    <Check size={18} className="text-[var(--status-success)]" />
                                ) : (
                                    <Copy size={18} className="text-[var(--text-muted)]" />
                                )}
                            </button>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between border border-[var(--glass-border)]">
                            <div>
                                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Password</p>
                                <p className="font-mono font-bold text-lg">{newCredentials.password}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(newCredentials.password, 'password')}
                                className="p-2 hover:bg-[var(--glass-border)] rounded-lg transition-colors ml-2"
                            >
                                {copied === 'password' ? (
                                    <Check size={18} className="text-[var(--status-success)]" />
                                ) : (
                                    <Copy size={18} className="text-[var(--text-muted)]" />
                                )}
                            </button>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        onClick={() => setShowCredentialsModal(false)}
                    >
                        I have copied the credentials
                    </Button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Remove Staff Member"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-[var(--status-error)]/10 rounded-lg border border-[var(--status-error)]/20">
                        <p className="text-[var(--status-error)] text-sm">
                            Are you sure you want to completely remove <strong>{selectedStaff?.name}</strong>?
                            This action cannot be undone and they will lose access immediately.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={handleDeleteStaff}
                        >
                            Confirm Remove
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

