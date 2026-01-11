'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
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
    MoreVertical
} from 'lucide-react'

// Mock data
const mockStaff: Staff[] = [
    {
        id: '1',
        user_id: 'STAFF001',
        name: 'Rahul Kumar',
        phone: '+91 98765 43210',
        is_active: true,
        created_at: '2026-01-01',
        created_by: 'admin',
        last_login: '2026-01-11T10:30:00Z',
    },
    {
        id: '2',
        user_id: 'STAFF002',
        name: 'Amit Singh',
        phone: '+91 87654 32109',
        is_active: true,
        created_at: '2026-01-03',
        created_by: 'admin',
        last_login: '2026-01-11T09:45:00Z',
    },
    {
        id: '3',
        user_id: 'STAFF003',
        name: 'Priya Sharma',
        phone: '+91 76543 21098',
        is_active: false,
        created_at: '2026-01-05',
        created_by: 'admin',
        last_login: '2026-01-09T18:20:00Z',
    },
    {
        id: '4',
        user_id: 'STAFF004',
        name: 'Vikash Gupta',
        phone: '+91 65432 10987',
        is_active: true,
        created_at: '2026-01-08',
        created_by: 'admin',
        last_login: '2026-01-11T11:15:00Z',
    },
]

function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

function generateUserId(): string {
    const num = Math.floor(Math.random() * 9000) + 1000
    return `STAFF${num}`
}

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<Staff[]>(mockStaff)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showCredentialsModal, setShowCredentialsModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
    const [newCredentials, setNewCredentials] = useState({ userId: '', password: '' })
    const [copied, setCopied] = useState<string | null>(null)

    // Form state
    const [newName, setNewName] = useState('')
    const [newPhone, setNewPhone] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const filteredStaff = staff.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleCreateStaff = async () => {
        setIsCreating(true)

        // Generate credentials
        const userId = generateUserId()
        const password = generatePassword()

        // TODO: Create staff in Supabase
        await new Promise(resolve => setTimeout(resolve, 1000))

        const newStaff: Staff = {
            id: Date.now().toString(),
            user_id: userId,
            name: newName,
            phone: newPhone,
            is_active: true,
            created_at: new Date().toISOString().split('T')[0],
            created_by: 'admin',
        }

        setStaff([newStaff, ...staff])
        setNewCredentials({ userId, password })
        setShowCreateModal(false)
        setShowCredentialsModal(true)
        setNewName('')
        setNewPhone('')
        setIsCreating(false)
    }

    const handleDeleteStaff = async () => {
        if (!selectedStaff) return

        // TODO: Delete staff from Supabase
        await new Promise(resolve => setTimeout(resolve, 500))

        setStaff(staff.filter((s) => s.id !== selectedStaff.id))
        setShowDeleteModal(false)
        setSelectedStaff(null)
    }

    const handleToggleActive = async (staffMember: Staff) => {
        // TODO: Update in Supabase
        setStaff(staff.map((s) =>
            s.id === staffMember.id ? { ...s, is_active: !s.is_active } : s
        ))
    }

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Staff Management</h1>
                    <p className="text-[var(--text-secondary)]">
                        Create, manage, and remove staff accounts
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <UserPlus size={18} />
                    Create Staff
                </Button>
            </div>

            {/* Search */}
            <Card>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <Input
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12"
                    />
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
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
                    <p className="text-2xl font-bold text-[var(--text-muted)]">
                        {staff.filter((s) => !s.is_active).length}
                    </p>
                </Card>
            </div>

            {/* Staff List */}
            <Card>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">
                                        No staff found
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((s) => (
                                    <tr key={s.id}>
                                        <td className="font-mono font-medium">{s.user_id}</td>
                                        <td className="font-medium">{s.name}</td>
                                        <td className="text-[var(--text-muted)]">{s.phone || '-'}</td>
                                        <td>
                                            <button onClick={() => handleToggleActive(s)}>
                                                <Badge
                                                    variant={s.is_active ? 'success' : 'error'}
                                                    dot
                                                    className="cursor-pointer hover:opacity-80"
                                                >
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </button>
                                        </td>
                                        <td className="text-[var(--text-muted)]">
                                            {s.last_login
                                                ? new Date(s.last_login).toLocaleDateString()
                                                : 'Never'
                                            }
                                        </td>
                                        <td className="text-[var(--text-muted)]">{s.created_at}</td>
                                        <td>
                                            <button
                                                onClick={() => {
                                                    setSelectedStaff(s)
                                                    setShowDeleteModal(true)
                                                }}
                                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[var(--status-error)]"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Staff Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create New Staff"
            >
                <div className="space-y-4">
                    <Input
                        label="Full Name"
                        placeholder="Enter staff name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                        label="Phone Number"
                        placeholder="Enter phone number"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                    />
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
                            disabled={!newName.trim()}
                        >
                            Create Staff
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Credentials Modal */}
            <Modal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
                title="Staff Credentials Created"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30">
                        <p className="text-sm text-[var(--status-warning)]">
                            ⚠️ Save these credentials now. The password cannot be retrieved later.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">User ID</p>
                                <p className="font-mono font-bold">{newCredentials.userId}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(newCredentials.userId, 'userId')}
                                className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors"
                            >
                                {copied === 'userId' ? (
                                    <Check size={18} className="text-[var(--status-success)]" />
                                ) : (
                                    <Copy size={18} className="text-[var(--text-muted)]" />
                                )}
                            </button>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">One-Time Password</p>
                                <p className="font-mono font-bold">{newCredentials.password}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(newCredentials.password, 'password')}
                                className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors"
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
                        Done
                    </Button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Remove Staff"
            >
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)]">
                        Are you sure you want to remove <strong>{selectedStaff?.name}</strong>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
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
                            Remove Staff
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
